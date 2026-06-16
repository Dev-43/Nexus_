"use client";

import { useState, useRef } from "react";
import { regenerateRoadmap } from "@/lib/api";

interface RoadmapRegenerateProps {
  roadmapId: string;
  roadmapLocked: boolean;
  regenerationCount: number;       // 0 | 1 | 2
  onRegenerateStart: () => void;   // parent hides roadmap, shows stream
}

type PanelState = "closed" | "open" | "submitting";

export function RoadmapRegenerate({
  roadmapId,
  roadmapLocked,
  regenerationCount,
  onRegenerateStart,
}: RoadmapRegenerateProps) {
  const [panel, setPanel] = useState<PanelState>("closed");
  const [feedback, setFeedback] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Guard — returns nothing when locked or limit reached
  if (roadmapLocked || regenerationCount >= 2) return null;

  const remaining = 2 - regenerationCount;
  const isLastUse = remaining === 1;

  async function handleSubmit() {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    setPanel("submitting");
    try {
      await regenerateRoadmap(roadmapId, trimmed);
      onRegenerateStart(); // parent re-mounts the SSE stream
    } catch (err) {
      // On error, revert to open so user can retry
      console.error("Regeneration failed:", err);
      setPanel("open");
    }
  }

  function openPanel() {
    setPanel("open");
    // Focus textarea after animation frame
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // ── Submitting state ──────────────────────────────────────────────────────
  if (panel === "submitting") {
    return (
      <div className="regen-loading">
        <Spinner />
        <span>Rebuilding your roadmap…</span>
      </div>
    );
  }

  // ── Collapsed trigger ─────────────────────────────────────────────────────
  if (panel === "closed") {
    return (
      <button
        onClick={openPanel}
        className="regen-trigger"
        aria-label="Give feedback to regenerate roadmap"
      >
        <RefreshIcon className="regen-trigger-icon" />
        <span className="regen-trigger-text">
          {isLastUse ? "This still doesn't look right" : "This doesn't look right"}
        </span>
        <span className={`regen-count ${isLastUse ? "regen-count--warn" : ""}`}>
          {remaining} left
        </span>
      </button>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────────────
  return (
    <div className={`regen-panel ${isLastUse ? "regen-panel--warn" : ""}`} role="region" aria-label="Roadmap feedback">
      <div className="regen-panel-header">
        <div>
          <p className="regen-panel-title">
            {isLastUse ? "Last regeneration" : "What should change?"}
          </p>
          <p className="regen-panel-sub">
            {isLastUse
              ? "Make it count — this is your final correction."
              : "Tell the AI what it got wrong. Be specific."}
          </p>
        </div>
        <button
          onClick={() => { setPanel("closed"); setFeedback(""); }}
          className="regen-close"
          aria-label="Close feedback panel"
        >
          ×
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="regen-textarea"
        placeholder="e.g. I already know basic loops and functions — focus on OOP, classes, and real project structure"
        rows={3}
      />

      <div className="regen-panel-footer">
        <span className={`regen-remaining ${isLastUse ? "regen-remaining--warn" : ""}`}>
          {remaining} regeneration{remaining !== 1 ? "s" : ""} remaining
        </span>
        <button
          onClick={handleSubmit}
          disabled={!feedback.trim()}
          className="regen-submit"
        >
          Rebuild roadmap →
        </button>
      </div>
    </div>
  );
}

// ── Inline SVG icons (no extra dep) ──────────────────────────────────────────
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="regen-spinner" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
