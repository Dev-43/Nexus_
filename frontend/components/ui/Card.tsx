"use client";

import React from "react";

type CardVariant = "default" | "skill" | "level";
type LevelState  = "locked" | "unlocked" | "completed" | "active";

interface CardProps {
  variant?:     CardVariant;
  levelState?:  LevelState;
  title?:       string;
  subtitle?:    string;
  description?: string;
  meta?:        string;
  icon?:        React.ReactNode;
  badge?:       React.ReactNode;
  footer?:      React.ReactNode;
  onClick?:     () => void;
  style?:       React.CSSProperties;
  children?:    React.ReactNode;
}

const levelStateConfig = {
  locked:    { bg: "var(--color-surface-locked)", border: "var(--color-border)",   titleColor: "var(--color-text-muted)",    cursor: "default",  shimmer: true,  badge: "Locked",      badgeBg: "rgba(74,81,104,0.3)",     badgeColor: "var(--color-text-muted)"    },
  unlocked:  { bg: "var(--color-surface)",        border: "var(--color-brand)",    titleColor: "var(--color-text-primary)",  cursor: "pointer",  shimmer: false, badge: "Up next",     badgeBg: "var(--color-brand-dim)",  badgeColor: "var(--color-brand)"         },
  active:    { bg: "var(--color-surface-raised)", border: "var(--color-brand)",    titleColor: "var(--color-text-primary)",  cursor: "pointer",  shimmer: false, badge: "In progress", badgeBg: "var(--color-brand-dim)",  badgeColor: "var(--color-brand)"         },
  completed: { bg: "var(--color-surface)",        border: "var(--color-success)",  titleColor: "var(--color-text-primary)",  cursor: "pointer",  shimmer: false, badge: "Complete",    badgeBg: "var(--color-success-dim)",badgeColor: "var(--color-success)"       },
};

function StateBadge({ label, bg, color }: { label: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: "var(--radius-full)", background: bg, color,
      fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em",
      textTransform: "uppercase", fontFamily: "var(--font-body)",
    }}>{label}</span>
  );
}

function LockedShimmer() {
  React.useEffect(() => {
    if (document.getElementById("nexus-shimmer")) return;
    const s = document.createElement("style");
    s.id = "nexus-shimmer";
    s.textContent = `@keyframes nexus-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`;
    document.head.appendChild(s);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "var(--radius-md)", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        animation: "nexus-shimmer 2.8s ease-in-out infinite",
      }} />
    </div>
  );
}

export function Card({
  variant = "default", levelState = "locked", title, subtitle, description,
  meta, icon, badge, footer, onClick, style, children,
}: CardProps) {
  const [hovered, setHovered] = React.useState(false);
  const isLevel    = variant === "level";
  const isLocked   = isLevel && levelState === "locked";
  const cfg        = isLevel ? levelStateConfig[levelState] : null;
  const isClickable = onClick && !isLocked;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    background: cfg?.bg ?? "var(--color-surface)",
    border: `1.5px solid ${cfg?.border ?? "var(--color-border)"}`,
    borderRadius: "var(--radius-md)", padding: "20px", overflow: "hidden",
    cursor: isClickable ? "pointer" : "default",
    boxShadow: hovered && isClickable ? "var(--shadow-card-hover)" : "var(--shadow-card)",
    transform: hovered && isClickable ? "translateY(-2px)" : "none",
    transition: "box-shadow var(--transition-normal), border-color var(--transition-normal), transform var(--transition-fast)",
    userSelect: "none", ...style,
  };

  return (
    <div
      style={containerStyle} onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      role={isClickable ? "button" : undefined} tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === "Enter" && onClick?.() : undefined}
    >
      {cfg?.shimmer && <LockedShimmer />}

      {(icon || cfg?.badge || badge) && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          {icon && <span style={{ fontSize: "1.5rem", opacity: isLocked ? 0.35 : 1, filter: isLocked ? "grayscale(1)" : "none" }}>{icon}</span>}
          <span style={{ flex: 1 }} />
          {(cfg?.badge || badge) && (
            <StateBadge label={badge ?? cfg?.badge ?? ""} bg={cfg?.badgeBg ?? "var(--color-brand-dim)"} color={cfg?.badgeColor ?? "var(--color-brand)"} />
          )}
        </div>
      )}

      {meta && <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.08em", color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>{meta}</p>}
      {title && <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.0625rem", fontWeight: 600, color: cfg?.titleColor ?? "var(--color-text-primary)", margin: 0, marginBottom: subtitle || description ? "4px" : 0, opacity: isLocked ? 0.5 : 1 }}>{title}</h3>}
      {subtitle && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: 0, marginBottom: description ? "8px" : 0, opacity: isLocked ? 0.5 : 1 }}>{subtitle}</p>}
      {description && <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.55, margin: 0, marginTop: "8px", opacity: isLocked ? 0.4 : 1 }}>{description}</p>}
      {children}
      {footer && <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--color-border)" }}>{footer}</div>}
    </div>
  );
}

export default Card;
