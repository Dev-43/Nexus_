"use client";

import { useEffect, useState } from "react";
import { submitSublevelDecision } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SublevelDecision =
  | "accept"
  | "reject"
  | "challenge"
  | "reassess"
  | "microlesson";

export interface SublevelSuggestion {
  title: string;
  description: string;
  lessonCount: number;
  conceptGaps: string[];
}

interface SubLevelModalProps {
  isOpen: boolean;
  suggestion: SublevelSuggestion;
  rejectCount: number;
  onDecision: (decision: SublevelDecision) => void;
}

const ALTERNATIVES = [
  {
    key: "challenge" as const,
    label: "Challenge Mode",
    icon: "⚡",
    description: "Retry the gate test at full difficulty. Skip the extra lessons.",
  },
  {
    key: "reassess" as const,
    label: "Re-assess",
    icon: "🔄",
    description: "Redo the original skill assessment to recalibrate your roadmap.",
  },
  {
    key: "microlesson" as const,
    label: "Micro-lessons",
    icon: "📖",
    description: "Short 5-minute bites covering just the essentials before you retry.",
  },
];

export default function SubLevelModal({
  isOpen,
  suggestion,
  rejectCount,
  onDecision,
}: SubLevelModalProps) {
  const [loading, setLoading] = useState<SublevelDecision | null>(null);
  const showAlternatives = rejectCount >= 3;

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDecision = async (decision: SublevelDecision) => {
    setLoading(decision);
    try {
      await submitSublevelDecision(decision);
      onDecision(decision);
    } catch (err) {
      console.error("Failed to submit sublevel decision:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="sublevel-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sublevel-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 20, 0.82)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--color-surface, #1a1a2e)",
          border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          padding: "0",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {showAlternatives ? (
          <AlternativesView loading={loading} onDecision={handleDecision} />
        ) : (
          <SublevelOfferView
            suggestion={suggestion}
            rejectCount={rejectCount}
            loading={loading}
            onDecision={handleDecision}
          />
        )}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

function SublevelOfferView({
  suggestion,
  rejectCount,
  loading,
  onDecision,
}: {
  suggestion: SublevelSuggestion;
  rejectCount: number;
  loading: SublevelDecision | null;
  onDecision: (d: SublevelDecision) => void;
}) {
  const rejectsLeft = 3 - rejectCount;
  return (
    <>
      <div style={{ background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)", padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>🔍</span>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
            Gap Identified
          </span>
        </div>
        <h2 id="sublevel-title" style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
          {suggestion.title}
        </h2>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.6, color: "var(--color-text-secondary, rgba(255,255,255,0.7))" }}>
          {suggestion.description}
        </p>
        {suggestion.conceptGaps.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted, rgba(255,255,255,0.4))" }}>
              Concepts to cover
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {suggestion.conceptGaps.map((gap) => (
                <span key={gap} style={{ padding: "3px 10px", borderRadius: "100px", background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)", fontSize: "12px", color: "#fbbf24", fontWeight: 500 }}>
                  {gap}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px" }}>
          <span style={{ fontSize: "16px" }}>📚</span>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary, rgba(255,255,255,0.65))" }}>
            <strong style={{ color: "var(--color-text, #fff)" }}>{suggestion.lessonCount} focused lessons</strong> — estimated 15–20 min
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => onDecision("accept")} disabled={loading !== null} style={{ padding: "13px 20px", borderRadius: "10px", border: "none", background: loading === "accept" ? "rgba(99,102,241,0.6)" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", color: "#fff", fontSize: "15px", fontWeight: 600, cursor: loading !== null ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {loading === "accept" ? <span style={{ opacity: 0.7 }}>Starting lessons…</span> : <><span>Start mini-lesson</span><span style={{ fontSize: "16px" }}>→</span></>}
          </button>
          <button onClick={() => onDecision("reject")} disabled={loading !== null} style={{ padding: "11px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "var(--color-text-secondary, rgba(255,255,255,0.55))", fontSize: "14px", fontWeight: 500, cursor: loading !== null ? "not-allowed" : "pointer" }}>
            Skip this — I'll retry directly
          </button>
        </div>
        {rejectsLeft < 3 && (
          <p style={{ marginTop: "12px", marginBottom: 0, fontSize: "11px", textAlign: "center", color: "var(--color-text-muted, rgba(255,255,255,0.35))" }}>
            {rejectsLeft === 1 ? "1 skip remaining before alternative paths unlock" : `${rejectsLeft} skips remaining`}
          </p>
        )}
      </div>
    </>
  );
}

function AlternativesView({ loading, onDecision }: { loading: SublevelDecision | null; onDecision: (d: SublevelDecision) => void }) {
  return (
    <>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>🔀</span>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-muted, rgba(255,255,255,0.4))" }}>
            Choose your path
          </span>
        </div>
        <h2 id="sublevel-title" style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "var(--color-text, #fff)" }}>
          How would you like to continue?
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary, rgba(255,255,255,0.55))", lineHeight: 1.5 }}>
          You've skipped the suggested lesson three times. Pick what works best for you.
        </p>
      </div>
      <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {ALTERNATIVES.map((alt) => (
          <button key={alt.key} onClick={() => onDecision(alt.key)} disabled={loading !== null} style={{ padding: "14px 16px", borderRadius: "12px", border: loading === alt.key ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.1)", background: loading === alt.key ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)", cursor: loading !== null ? "not-allowed" : "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>{alt.icon}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text, #fff)", marginBottom: "3px", display: "flex", alignItems: "center", gap: "8px" }}>
                {alt.label}
                {loading === alt.key && <span style={{ fontSize: "12px", color: "#818cf8", fontWeight: 400 }}>Loading…</span>}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary, rgba(255,255,255,0.5))", lineHeight: 1.5 }}>
                {alt.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
