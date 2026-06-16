import { useState, useEffect, useRef, useCallback } from "react";

export type StreamPhase = "connecting" | "thinking" | "streaming" | "complete" | "error";

export interface UseRoadmapStreamOptions {
  url: string;
  /** Called once when the 'done' SSE event fires. Receives the roadmap_id to fetch. */
  onComplete?: (roadmapId: string) => void;
  /** Called when the stream errors out. */
  onError?: (message: string) => void;
  /** If false, the hook won't open the connection yet. Default: true */
  enabled?: boolean;
}

export interface UseRoadmapStreamResult {
  phase: StreamPhase;
  thinkingMessage: string | null;
  tokens: string;
  errorMessage: string | null;
  /** Manually close and reset — useful when unmounting or retrying */
  reset: () => void;
}

export function useRoadmapStream({
  url,
  onComplete,
  onError,
  enabled = true,
}: UseRoadmapStreamOptions): UseRoadmapStreamResult {
  const [phase, setPhase] = useState<StreamPhase>("connecting");
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const [tokens, setTokens] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setPhase("connecting");
    setThinkingMessage(null);
    setTokens("");
    setErrorMessage(null);
  }, [cleanup]);

  useEffect(() => {
    if (!enabled || !url) return;

    cleanup(); // close any previous connection

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      // Connection open — stay in "connecting" until first event arrives
    };

    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: "thinking" | "token" | "done" | "error";
          message?: string;
          content?: string;
          roadmap_id?: string;
        };

        switch (data.type) {
          case "thinking":
            setPhase("thinking");
            setThinkingMessage(data.message ?? null);
            break;

          case "token":
            setPhase("streaming");
            setThinkingMessage(null);
            setTokens((prev) => prev + (data.content ?? ""));
            break;

          case "done":
            setPhase("complete");
            cleanup();
            onComplete?.(data.roadmap_id ?? "");
            break;

          case "error":
            setPhase("error");
            setErrorMessage(data.message ?? "Stream error");
            cleanup();
            onError?.(data.message ?? "Stream error");
            break;
        }
      } catch {
        // Non-JSON events — ignore silently
      }
    };

    es.onerror = () => {
      setPhase("error");
      setErrorMessage("Connection lost. Please refresh and try again.");
      cleanup();
      onError?.("Connection lost");
    };

    return cleanup;
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, thinkingMessage, tokens, errorMessage, reset };
}
