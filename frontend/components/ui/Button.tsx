"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "var(--color-brand)",          color: "var(--color-text-inverse)", border: "1.5px solid transparent" },
  secondary: { background: "var(--color-surface-raised)", color: "var(--color-text-primary)", border: "1.5px solid var(--color-border)" },
  ghost:     { background: "transparent",                 color: "var(--color-text-secondary)",border: "1.5px solid transparent" },
  danger:    { background: "var(--color-danger-dim)",     color: "var(--color-danger)",        border: "1.5px solid var(--color-danger)" },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px",  fontSize: "0.8125rem", borderRadius: "var(--radius-sm)", gap: "6px"  },
  md: { padding: "10px 20px", fontSize: "0.9375rem", borderRadius: "var(--radius-md)", gap: "8px"  },
  lg: { padding: "14px 28px", fontSize: "1.0625rem", borderRadius: "var(--radius-md)", gap: "10px" },
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
  disabled, leftIcon, rightIcon, children, style, onMouseEnter, onMouseLeave, ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)", fontWeight: 600, letterSpacing: "-0.01em",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.45 : 1,
    transition: "background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)",
    transform: hovered && !isDisabled ? "translateY(-1px)" : "none",
    boxShadow: hovered && !isDisabled && variant === "primary" ? "var(--shadow-card-hover)" : "none",
    width: fullWidth ? "100%" : undefined,
    whiteSpace: "nowrap", userSelect: "none", outline: "none",
    ...variantStyles[variant], ...sizeStyles[size], ...style,
  };

  return (
    <button
      disabled={isDisabled} style={baseStyle}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
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
