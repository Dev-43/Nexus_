import { useState, useEffect, useRef, useCallback } from "react";

export type StreamPhase = "connecting" | "thinking" | "streaming" | "complete" | "error";

export interface UseRoadmapStreamOptions {
  url: string;
  onComplete?: (roadmapId: string) => void;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export interface UseRoadmapStreamResult {
  phase: StreamPhase;
  thinkingMessage: string | null;
  tokens: string;
  errorMessage: string | null;
  reset: () => void;
}

// ─── Flip to false on Day 5 integration sync ──────────────────────────────────
const MOCK_MODE = false;

const MOCK_THINKING_MESSAGES = [
  "Analysing your assessment results...",
  "Understanding your learning style...",
  "Building your personalised path...",
];

const MOCK_ROADMAP_TOKENS = `## Python Roadmap — Beginner

**Level 1: Python Foundations**
Variables, data types, conditionals, loops, and functions. You'll write your first real scripts and understand how Python thinks.

**Level 2: Data Structures & OOP**
Lists, dicts, sets, classes, and inheritance. You'll model real-world problems with objects and collections.

**Level 3: Applied Python**
File I/O, APIs, error handling, and a capstone project. You'll build something you can put on your portfolio.
`;

const MOCK_ROADMAP_ID = "mock-roadmap-001";
// ─────────────────────────────────────────────────────────────────────────────

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
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
    cleanup();

    // ── MOCK PATH ────────────────────────────────────────────────────────────
    if (MOCK_MODE) {
      let cancelled = false;

      async function runMock() {
        // Step 1 — show thinking messages
        for (const msg of MOCK_THINKING_MESSAGES) {
          if (cancelled) return;
          setPhase("thinking");
          setThinkingMessage(msg);
          await delay(800);
        }

        // Step 2 — stream tokens character by character
        if (cancelled) return;
        setPhase("streaming");
        setThinkingMessage(null);

        for (let i = 0; i < MOCK_ROADMAP_TOKENS.length; i++) {
          if (cancelled) return;
          setTokens((prev) => prev + MOCK_ROADMAP_TOKENS[i]);
          await delay(12);
        }

        // Step 3 — done
        if (cancelled) return;
        setPhase("complete");
        onComplete?.(MOCK_ROADMAP_ID);
      }

      runMock();
      return () => { cancelled = true; cleanup(); };
    }

    // ── REAL SSE PATH (used from Day 5 onwards) ──────────────────────────────
    const es = new EventSource(url);
    esRef.current = es;

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
        // Non-JSON events — ignore
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
