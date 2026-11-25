"use client";

import React from "react";

type BadgeTier = "bronze" | "silver" | "gold" | "diamond" | "streak" | "first" | "speed" | "no-hints";
type BadgeSize = "sm" | "md" | "lg" | "xl";

interface BadgeProps {
  tier:       BadgeTier;
  size?:      BadgeSize;
  showLabel?: boolean;
  animate?:   boolean;
  earned?:    boolean;
  style?:     React.CSSProperties;
}

const tierConfig = {
  bronze:    { emoji: "🥉", label: "Bronze",      bg: "#261608", border: "rgba(212,131,74,0.4)",  color: "#FFD4A8" },
  silver:    { emoji: "🥈", label: "Silver",      bg: "#181D29", border: "rgba(158,176,204,0.4)", color: "#D6E4F0" },
  gold:      { emoji: "🥇", label: "Gold",        bg: "#241904", border: "rgba(212,168,39,0.4)",  color: "#FFECAA" },
  diamond:   { emoji: "💎", label: "Diamond",     bg: "#0D1A26", border: "rgba(96,200,232,0.4)",  color: "#B8EEFF" },
  streak:    { emoji: "🔥", label: "7-Day Streak",bg: "#241208", border: "rgba(255,107,53,0.4)",  color: "#FFB899" },
  first:     { emoji: "⭐", label: "First Skill", bg: "#1B1726", border: "rgba(156,111,232,0.4)", color: "#D4B8FF" },
  speed:     { emoji: "⚡", label: "Speed Runner",bg: "#171D0F", border: "rgba(139,203,62,0.4)",  color: "#C8F0A0" },
  "no-hints":{ emoji: "🎯", label: "No Hints",    bg: "#171A26", border: "rgba(108,99,255,0.4)",  color: "#C0BCFF" },
};

const sizeConfig = {
  sm: { outer: 36,  emoji: "1.1rem",  fontSize: "0.72rem"   },
  md: { outer: 56,  emoji: "1.75rem", fontSize: "0.8125rem" },
  lg: { outer: 80,  emoji: "2.5rem",  fontSize: "0.9375rem" },
  xl: { outer: 120, emoji: "3.75rem", fontSize: "1.125rem"  },
};

function normalizeTier(tier: string): BadgeTier {
  const normalized = tier.toLowerCase();
  if (normalized in tierConfig) {
    return normalized as BadgeTier;
  }
  return "bronze";
}

export function Badge({ tier, size = "md", showLabel = false, animate = false, earned = true, style }: BadgeProps) {
  const cfg  = tierConfig[normalizeTier(tier)];
  const sz   = sizeConfig[size];
  const [ready, setReady] = React.useState(!animate);

  React.useEffect(() => {
    if (!animate) return;
    if (!document.getElementById("nexus-badge-kf")) {
      const s = document.createElement("style");
      s.id = "nexus-badge-kf";
      s.textContent = `
        @keyframes nexus-badge-in { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); } 80% { transform: scale(0.96); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes nexus-badge-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.75; } }
      `;
      document.head.appendChild(s);
    }
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, [animate]);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "8px", opacity: earned ? 1 : 0.3, filter: earned ? "none" : "grayscale(1)", ...style }}>
      <div style={{
        width: sz.outer, height: sz.outer, borderRadius: "50%",
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: sz.emoji, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
        animation: animate && ready && earned ? "nexus-badge-in 0.55s var(--transition-spring) forwards" : "none",
        transform: animate && !ready ? "scale(0.4)" : "none",
        opacity:   animate && !ready ? 0 : 1,
      }} title={cfg.label}>
        {cfg.emoji}
      </div>
      {showLabel && (
        <span style={{ fontFamily: "var(--font-display)", fontSize: sz.fontSize, fontWeight: 600, color: cfg.color, letterSpacing: "0.02em", textAlign: "center" }}>
          {cfg.label}
        </span>
      )}
    </div>
  );
}

export default Badge;
