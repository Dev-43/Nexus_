"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRoadmapStream } from "@/lib/hooks/useRoadmapStream";

function LoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const feedback = searchParams.get("feedback");

  const [activeStep, setActiveStep] = useState(1);

  const streamUrl = sessionId
    ? feedback
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/regenerate?session_id=${sessionId}&feedback=${encodeURIComponent(feedback)}`
      : `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/roadmap?session_id=${sessionId}`
    : "";

  const { phase, thinkingMessage, tokens, errorMessage } = useRoadmapStream({
    url: streamUrl,
    enabled: !!sessionId,
    onComplete: (roadmapId) => {
      if (roadmapId) {
        setActiveStep(3);
        setTimeout(() => {
          router.push(`/roadmap/${roadmapId}`);
        }, 600);
      }
    },
  });

  useEffect(() => {
    if (phase === "streaming") {
      setActiveStep(2);
    }
  }, [phase]);

  if (!sessionId) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary, #94A3B8)", fontSize: 16 }}>
          Missing session identifier — please return and select a skill.
        </p>
        <button
          onClick={() => router.push("/skill")}
          style={{
            marginTop: 16,
            background: "var(--color-brand, #3B82F6)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Select Skill
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "50px 20px 80px" }}>
      {/* Top Header & Spinner */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#0D0E13",
            boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.1)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.14)",
              borderTopColor: "#F8FAFC",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--color-text-primary, #F8FAFC)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {feedback ? "Rebuilding Your Learning Path" : "Generating Your Personalised Roadmap"}
        </h1>

        <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary, #94A3B8)" }}>
          {thinkingMessage || "Synthesizing curriculum from your assessment profile..."}
        </p>
      </div>

      {/* Generation Pipeline Stages */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          { step: 1, label: "Assessment Profiling", desc: "Diagnostic evaluation & skill gaps" },
          { step: 2, label: "Curriculum Architecture", desc: "Multi-level progression logic" },
          { step: 3, label: "Resource Validation", desc: "Curating docs, projects & gate tests" },
        ].map((item) => {
          const isDone = activeStep > item.step || phase === "complete";
          const isCurrent = activeStep === item.step && phase !== "complete";

          return (
            <div
              key={item.step}
              style={{
                padding: "14px 16px",
                borderRadius: "12px",
                background: isCurrent
                  ? "#12151C"
                  : "var(--color-surface, #090A0D)",
                boxShadow: isCurrent
                  ? "0 0 0 1px rgba(59, 130, 246, 0.45)"
                  : isDone
                  ? "0 0 0 1px rgba(16, 185, 129, 0.35)"
                  : "0 0 0 1px rgba(255, 255, 255, 0.08)",
                transitionProperty: "background-color, box-shadow",
                transitionDuration: "200ms",
                transitionTimingFunction: "ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDone
                      ? "var(--color-success, #10B981)"
                      : isCurrent
                      ? "var(--color-brand, #3B82F6)"
                      : "var(--color-surface-raised, #121520)",
                    color: "#fff",
                  }}
                >
                  {isDone ? "✓" : item.step}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isCurrent
                      ? "var(--color-text-primary, #F8FAFC)"
                      : isDone
                      ? "var(--color-text-primary, #F8FAFC)"
                      : "var(--color-text-muted, #64748B)",
                  }}
                >
                  {item.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary, #94A3B8)", lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stream Output Card */}
      {(phase === "streaming" || phase === "complete" || tokens.length > 0) && (
        <div
          style={{
            background: "#090A0D",
            boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#0D0E13",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--color-text-muted, #64748B)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Curriculum outline
            </span>
          </div>

          {/* Formatted Stream Content */}
          <div
            style={{
              padding: "20px 24px",
              maxHeight: 380,
              overflowY: "auto",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: 14,
              lineHeight: 1.7,
              color: "#CBD5E1",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>
              {tokens}
              {phase === "streaming" && (
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 15,
                    marginLeft: 4,
                    background: "var(--color-brand, #3B82F6)",
                    verticalAlign: "middle",
                    animation: "blink 1s infinite",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {phase === "error" && (
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--color-danger, #EF4444)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Generation encountered an issue</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{errorMessage}</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function RoadmapLoadingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--color-text-secondary, #94A3B8)" }}>
          Initializing curriculum synthesizer…
        </div>
      }
    >
      <LoadingContent />
    </Suspense>
  );
}
