"use client";

import React from "react";

type ProgressVariant = "default" | "success" | "warn" | "danger";
type ProgressSize    = "xs" | "sm" | "md" | "lg";

interface ProgressBarProps {
  value:       number;
  max?:        number;
  variant?:    ProgressVariant;
  size?:       ProgressSize;
  label?:      string;
  showValue?:  boolean;
  animated?:   boolean;
  striped?:    boolean;
  style?:      React.CSSProperties;
}

const gradients = {
  default: "linear-gradient(90deg, #6C63FF 0%, #2DD4A0 100%)",
  success: "linear-gradient(90deg, #1EA87E 0%, #2DD4A0 100%)",
  warn:    "linear-gradient(90deg, #D4830A 0%, #F5A623 100%)",
  danger:  "linear-gradient(90deg, #CC1E3D 0%, #FF4F6D 100%)",
};

const heights = { xs: 3, sm: 5, md: 8, lg: 12 };

export function ProgressBar({ value, max = 100, variant = "default", size = "sm", label, showValue = false, animated = true, striped = false, style }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const height = heights[size];
  const [displayed, setDisplayed] = React.useState(animated ? 0 : pct);

  React.useEffect(() => {
    if (!animated) { setDisplayed(pct); return; }
    const t = setTimeout(() => setDisplayed(pct), 80);
    return () => clearTimeout(t);
  }, [pct, animated]);

  React.useEffect(() => {
    if (!striped || document.getElementById("nexus-progress-kf")) return;
    const s = document.createElement("style");
    s.id = "nexus-progress-kf";
    s.textContent = `@keyframes nexus-stripe { 0% { background-position: 0 0; } 100% { background-position: 24px 0; } }`;
    document.head.appendChild(s);
  }, [striped]);

  return (
    <div style={{ width: "100%", ...style }}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          {label && <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>{label}</span>}
          {showValue && <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ width: "100%", height, borderRadius: "var(--radius-full)", background: "var(--color-surface-raised)", overflow: "hidden", position: "relative" }}>
        <div style={{
          height: "100%", width: `${displayed}%`, borderRadius: "var(--radius-full)",
          background: striped
            ? `repeating-linear-gradient(60deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px), ${gradients[variant]}`
            : gradients[variant],
          backgroundSize: striped ? "24px 100%" : "auto",
          animation: striped ? "nexus-stripe 1s linear infinite" : "none",
          transition: animated ? "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          boxShadow: pct > 0 ? "0 0 8px rgba(108,99,255,0.35)" : "none",
        }} />
      </div>
    </div>
  );
}

interface StepProgressProps {
  current: number;
  total:   number;
  style?:  React.CSSProperties;
}

export function StepProgress({ current, total, style }: StepProgressProps) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", ...style }}>
      {Array.from({ length: total }, (_, i) => {
        const isDone   = i + 1 < current;
        const isActive = i + 1 === current;
        return (
          <div key={i} style={{
            height: 4, flex: isActive ? 2 : 1, borderRadius: "var(--radius-full)",
            background: isDone ? "var(--color-success)" : isActive ? "var(--color-brand)" : "var(--color-surface-raised)",
            transition: "flex 0.3s ease, background 0.2s ease",
          }} />
        );
      })}
    </div>
  );
}

export default ProgressBar;
