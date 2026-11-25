"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  static?:    boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "#F8FAFC",                    color: "#09090B",                   border: "none", boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" },
  secondary: { background: "var(--color-surface-raised)", color: "var(--color-text-primary)", border: "none", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" },
  ghost:     { background: "transparent",                 color: "var(--color-text-secondary)",border: "none", boxShadow: "none" },
  danger:    { background: "var(--color-danger-dim)",     color: "var(--color-danger)",        border: "none", boxShadow: "0 0 0 1px rgba(239,68,68,0.3)" },
};

const sizeMetrics: Record<ButtonSize, { py: number; px: number; fontSize: string; radius: string; gap: string; minH: number }> = {
  sm: { py: 8,  px: 14, fontSize: "0.8125rem", radius: "var(--radius-sm)", gap: "6px",  minH: 40 },
  md: { py: 10, px: 18, fontSize: "0.9375rem", radius: "var(--radius-md)", gap: "8px",  minH: 42 },
  lg: { py: 12, px: 24, fontSize: "1rem",      radius: "var(--radius-md)", gap: "10px", minH: 46 },
};

function Spinner({ size }: { size: ButtonSize }) {
  const dim = size === "sm" ? 14 : size === "md" ? 16 : 20;
  return (
    <span style={{
      width: dim, height: dim, borderRadius: "50%",
      border: "2px solid currentColor", borderTopColor: "transparent",
      display: "inline-block", animation: "nexus-spin 0.65s linear infinite",
    }} />
  );
}

if (typeof document !== "undefined" && !document.getElementById("nexus-btn-kf")) {
  const s = document.createElement("style");
  s.id = "nexus-btn-kf";
  s.textContent = `@keyframes nexus-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

export function Button({
  variant = "primary", size = "md", loading = false, fullWidth = false,
  static: isStatic = false, disabled, leftIcon, rightIcon, children, style,
  onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const isDisabled = disabled || loading;
  const m = sizeMetrics[size];

  // Optical alignment: reduce padding by 2px on the side holding an icon
  const paddingLeft = leftIcon && !rightIcon ? m.px - 2 : m.px;
  const paddingRight = rightIcon && !leftIcon ? m.px - 2 : m.px;

  const hoverShadow =
    variant === "primary"
      ? "0 0 0 1px rgba(255,255,255,0.22)"
      : variant === "secondary"
      ? "0 0 0 1px rgba(255,255,255,0.16)"
      : variantStyles[variant].boxShadow;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)", fontWeight: 600, letterSpacing: "-0.01em",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.45 : hovered && variant === "primary" ? 0.92 : 1,
    transitionProperty: "background-color, box-shadow, transform, opacity",
    transitionDuration: "150ms",
    transitionTimingFunction: "ease-out",
    transform: !isStatic && pressed && !isDisabled ? "scale(0.96)" : "none",
    minHeight: m.minH,
    paddingTop: m.py,
    paddingBottom: m.py,
    paddingLeft,
    paddingRight,
    fontSize: m.fontSize,
    borderRadius: m.radius,
    gap: m.gap,
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap", userSelect: "none", outline: "none",
    ...variantStyles[variant],
    ...(hovered && !isDisabled ? { boxShadow: hoverShadow } : {}),
    ...style,
  };

  return (
    <button
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); setPressed(false); onMouseLeave?.(e); }}
      onMouseDown={(e) => { setPressed(true); onMouseDown?.(e); }}
      onMouseUp={(e) => { setPressed(false); onMouseUp?.(e); }}
      {...props}
    >
      {loading ? <Spinner size={size} /> : (
        <>
          {leftIcon && <span style={{ display: "flex", alignItems: "center" }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: "flex", alignItems: "center" }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
