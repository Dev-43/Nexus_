"use client";

import React from "react";

type QuizOptionState = "default" | "selected" | "correct" | "wrong" | "disabled";

interface QuizOptionProps {
  label:    string;
  text:     string;
  state?:   QuizOptionState;
  onClick?: () => void;
  style?:   React.CSSProperties;
}

const stateConfig = {
  default:  { bg: "var(--color-surface)",       border: "var(--color-border)",   labelBg: "var(--color-surface-raised)", labelColor: "var(--color-text-secondary)", textColor: "var(--color-text-primary)", cursor: "pointer",    icon: null },
  selected: { bg: "rgba(108,99,255,0.08)",       border: "var(--color-brand)",    labelBg: "var(--color-brand)",          labelColor: "#fff",                        textColor: "var(--color-text-primary)", cursor: "pointer",    icon: null },
  correct:  { bg: "var(--color-success-dim)",    border: "var(--color-success)",  labelBg: "var(--color-success)",        labelColor: "#0A0E1A",                     textColor: "var(--color-success)",      cursor: "default",    icon: "✓" },
  wrong:    { bg: "var(--color-danger-dim)",     border: "var(--color-danger)",   labelBg: "var(--color-danger)",         labelColor: "#fff",                        textColor: "var(--color-danger)",       cursor: "default",    icon: "✕" },
  disabled: { bg: "var(--color-surface)",        border: "var(--color-border)",   labelBg: "var(--color-surface-raised)", labelColor: "var(--color-text-muted)",     textColor: "var(--color-text-muted)",   cursor: "not-allowed",icon: null },
};

export function QuizOption({ label, text, state = "default", onClick, style }: QuizOptionProps) {
  const [hovered, setHovered] = React.useState(false);
  const cfg       = stateConfig[state];
  const isActive  = state === "default" || state === "selected";
  const isClickable = isActive && !!onClick;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        padding: "14px 16px", borderRadius: "var(--radius-md)",
        background: hovered && isClickable ? "rgba(108,99,255,0.06)" : cfg.bg,
        border: `1.5px solid ${hovered && isClickable && state === "default" ? "rgba(108,99,255,0.5)" : cfg.border}`,
        cursor: cfg.cursor,
        transform: hovered && isClickable ? "translateX(3px)" : "none",
        transition: "background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)",
        userSelect: "none",
        boxShadow: state === "selected" ? "var(--shadow-glow)" : "none",
        ...style,
      }}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
      aria-pressed={state === "selected"}
    >
      <div style={{
        width: 32, height: 32, borderRadius: "var(--radius-sm)",
        background: cfg.labelBg, color: cfg.labelColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.8125rem", fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0,
        transition: "background var(--transition-fast), color var(--transition-fast)",
      }}>
        {cfg.icon ?? label}
      </div>
      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: cfg.textColor, lineHeight: 1.45, flex: 1, transition: "color var(--transition-fast)" }}>
        {text}
      </span>
      {(state === "correct" || state === "wrong") && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: state === "correct" ? "var(--color-success)" : "var(--color-danger)", flexShrink: 0 }} />
      )}
    </div>
  );
}

export default QuizOption;
