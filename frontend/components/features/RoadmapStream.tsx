"use client";

import React from "react";
import { useRoadmapStream } from "@/lib/hooks/useRoadmapStream";

// ─── Token-level type scale from tokens.ts ───────────────────────────────────
// Inlined here so this component works standalone even if tokens.ts isn't wired yet.
// Replace with `import { colors, ... } from "@/design/tokens"` once tokens.ts exists.
const TOKENS = {
  bg: "var(--color-bg, #0e0f1a)",
  surface: "var(--color-surface, #161728)",
  surfaceAlt: "var(--color-surface-alt, #1e2035)",
  accent: "var(--color-accent, #7c6af7)",
  accentSoft: "var(--color-accent-soft, #3d3680)",
  textPrimary: "var(--color-text-primary, #f0f0ff)",
  textSecondary: "var(--color-text-secondary, #9898bb)",
  success: "var(--color-success, #34d399)",
  error: "var(--color-error, #f87171)",
  radius: "var(--radius-md, 12px)",
  fontMono: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
  fontBody: "var(--font-body, 'Inter', system-ui, sans-serif)",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonPulse() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[100, 80, 90, 70, 85].map((w, i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: `${w}%`,
            borderRadius: 6,
            background: `linear-gradient(90deg, ${TOKENS.surfaceAlt} 25%, ${TOKENS.accentSoft}55 50%, ${TOKENS.surfaceAlt} 75%)`,
            backgroundSize: "200% 100%",
            animation: `shimmer 1.6s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}

function ThinkingDots({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: TOKENS.textSecondary,
        fontFamily: TOKENS.fontBody,
        fontSize: 14,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: TOKENS.accent,
              animation: "bounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
              display: "inline-block",
            }}
          />
        ))}
      </span>
      <span>{message}</span>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: TOKENS.fontBody,
        fontSize: 15,
        lineHeight: 1.75,
        color: TOKENS.textPrimary,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
      {/* Blinking cursor */}
      <span
        style={{
          display: "inline-block",
          width: 2,
          height: "1em",
          background: TOKENS.accent,
          marginLeft: 2,
          verticalAlign: "text-bottom",
          animation: "blink 1s step-end infinite",
        }}
      />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function CompleteCheck() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: TOKENS.success,
        fontFamily: TOKENS.fontBody,
        fontSize: 13,
        fontWeight: 500,
        marginTop: 16,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7.5" stroke={TOKENS.success} strokeWidth="1" />
        <path
          d="M4.5 8.5L6.5 10.5L11.5 5.5"
          stroke={TOKENS.success}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Roadmap ready
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: TOKENS.radius,
        background: `${TOKENS.error}18`,
        border: `1px solid ${TOKENS.error}40`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p
        style={{
          color: TOKENS.error,
          fontFamily: TOKENS.fontBody,
          fontSize: 14,
          margin: 0,
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            alignSelf: "flex-start",
            padding: "6px 14px",
            borderRadius: 6,
            border: `1px solid ${TOKENS.error}60`,
            background: "transparent",
            color: TOKENS.error,
            fontFamily: TOKENS.fontBody,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface RoadmapStreamProps {
  /** SSE endpoint URL, e.g. `/api/stream/roadmap?session_id=...` */
  streamUrl: string;
  /** Called once the stream is complete. Receives the roadmap_id for fetching full JSON. */
  onComplete: (roadmapId: string) => void;
  /** Called when stream fails. */
  onError?: (message: string) => void;
  /** Pass false to delay opening the connection (e.g. waiting for a trigger). Default true. */
  enabled?: boolean;
}

export function RoadmapStream({ streamUrl, onComplete, onError, enabled = true }: RoadmapStreamProps) {
  const { phase, thinkingMessage, tokens, errorMessage, reset } = useRoadmapStream({
    url: streamUrl,
    onComplete,
    onError,
    enabled,
  });

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.accentSoft}`,
        borderRadius: TOKENS.radius,
        padding: "24px 28px",
        minHeight: 160,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle accent glow in top-left */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `${TOKENS.accent}18`,
          pointerEvents: "none",
          filter: "blur(30px)",
        }}
      />

      {/* Label */}
      <p
        style={{
          fontFamily: TOKENS.fontBody,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: TOKENS.accent,
          margin: "0 0 16px",
        }}
      >
        Your personalised roadmap
      </p>

      {/* Phase content */}
      {phase === "connecting" && <SkeletonPulse />}

      {phase === "thinking" && thinkingMessage && (
        <ThinkingDots message={thinkingMessage} />
      )}

      {(phase === "streaming" || phase === "complete") && (
        <>
          <StreamingText text={tokens} />
          {phase === "complete" && <CompleteCheck />}
        </>
      )}

      {phase === "error" && (
        <ErrorState message={errorMessage ?? "Something went wrong."} onRetry={reset} />
      )}
    </div>
  );
}

export default RoadmapStream;
