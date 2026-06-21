"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoadmapStream } from "@/lib/hooks/useRoadmapStream";

function LoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const feedback = searchParams.get("feedback");

  const streamUrl = sessionId
    ? feedback
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/regenerate?session_id=${sessionId}&feedback=${encodeURIComponent(feedback)}`
      : `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/roadmap?session_id=${sessionId}`
    : "";

  const { phase, thinkingMessage, tokens, errorMessage } = useRoadmapStream({
    url: streamUrl,
    enabled: !!sessionId,
    onComplete: (roadmapId) => {
      if (roadmapId) router.push(`/roadmap/${roadmapId}`);
    },
  });

  if (!sessionId) {
    return <div style={{ padding: 40, textAlign: "center" }}>Missing session — go back and select a skill.</div>;
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px" }}>
      {(phase === "connecting" || phase === "thinking") && (
        <p style={{ color: "var(--color-text-muted)" }}>{thinkingMessage ?? "Connecting..."}</p>
      )}
      {(phase === "streaming" || phase === "complete") && (
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6 }}>
          {tokens}
        </pre>
      )}
      {phase === "error" && (
        <p style={{ color: "var(--color-error, #ef4444)" }}>{errorMessage}</p>
      )}
    </div>
  );
}

export default function RoadmapLoadingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
      <LoadingContent />
    </Suspense>
  );
}