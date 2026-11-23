// ============================================================
// Nexus Design Tokens
// Single source of truth — true black OLED background with
// vibrant, purposeful accents (no harsh neon, no generic AI slop).
// ============================================================

export const colors = {
  // Backgrounds - TRUE BLACK OLED PALETTE
  bg:            "#000000",   // true pure black background
  surface:       "#090A0F",   // card / panel base
  surfaceRaised: "#121520",   // elevated card, modal, active state
  surfaceLocked: "#050608",   // locked level card bg

  // Brand - Vivid Electric Cobalt (high-contrast, purposeful)
  brand:         "#3B82F6",   // vivid royal blue — primary actions, active states
  brandHover:    "#2563EB",   // focused/hover blue
  brandDim:      "rgba(59, 130, 246, 0.14)", // brand pressed / active bg
  brandGlow:     "rgba(59, 130, 246, 0.28)", // crisp glow shadow

  // Vibrant Accents (Tasteful & Distinct)
  accentPurple:  "#8B5CF6",   // regal iris / deep violet
  accentOrange:  "#F59E0B",   // warm radiant amber (streaks, xp)
  accentEmerald: "#10B981",   // clean botanical emerald (pass, verified)
  accentCyan:    "#06B6D4",   // electric azure highlight
  accentSlate:   "#334155",   // crisp dark slate

  // Semantic
  success:       "#10B981",   // emerald — pass, correct, complete
  successDim:    "rgba(16, 185, 129, 0.14)",
  warn:          "#F59E0B",   // warm amber — partial credit, caution
  warnDim:       "rgba(245, 158, 11, 0.14)",
  danger:        "#EF4444",   // vivid ruby — fail, wrong, error
  dangerDim:     "rgba(239, 68, 68, 0.14)",

  // Text
  textPrimary:   "#F8FAFC",   // crisp, clean white on true black
  textSecondary: "#94A3B8",   // sophisticated readable slate
  textMuted:     "#64748B",   // subtle tertiary
  textInverse:   "#000000",   // true black text on light buttons

  // Borders
  border:        "#1E2330",
  borderSubtle:  "rgba(255, 255, 255, 0.08)",
  borderFocus:   "#3B82F6",
  borderSlate:   "#334155",

  // Badge tier colors
  badge: {
    bronze:  { bg: "rgba(217, 119, 6, 0.14)", accent: "#D97706", text: "#FDE68A" },
    silver:  { bg: "rgba(148, 163, 184, 0.14)", accent: "#94A3B8", text: "#F1F5F9" },
    gold:    { bg: "rgba(245, 158, 11, 0.14)", accent: "#F59E0B", text: "#FEF08A" },
    diamond: { bg: "rgba(59, 130, 246, 0.14)", accent: "#3B82F6", text: "#BAE6FD" },
    purple:  { bg: "rgba(139, 92, 246, 0.14)", accent: "#8B5CF6", text: "#DDD6FE" },
  },
} as const;

export const typography = {
  fontDisplay: "'Space Grotesk', system-ui, sans-serif",
  fontBody:    "'Inter', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', 'Fira Mono', monospace",

  size: {
    xs:   "0.75rem",
    sm:   "0.875rem",
    base: "1rem",
    lg:   "1.125rem",
    xl:   "1.25rem",
    "2xl":"1.5rem",
    "3xl":"1.875rem",
    "4xl":"2.25rem",
    "5xl":"3rem",
  },

  weight: {
    regular: "400",
    medium:  "500",
    semibold:"600",
    bold:    "700",
  },

  leading: {
    tight:   "1.2",
    snug:    "1.35",
    normal:  "1.5",
    relaxed: "1.65",
  },

  tracking: {
    tight:  "-0.02em",
    normal: "0em",
    wide:   "0.04em",
    widest: "0.1em",
  },
} as const;

export const spacing = {
  "0":  "0px",
  "1":  "4px",
  "2":  "8px",
  "3":  "12px",
  "4":  "16px",
  "5":  "20px",
  "6":  "24px",
  "8":  "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
  "20": "80px",
  "24": "96px",
} as const;

export const radius = {
  sm:   "6px",
  md:   "12px",
  lg:   "16px",
  xl:   "24px",
  full: "9999px",
} as const;

export const shadows = {
  card:        "0 2px 8px rgba(0,0,0,0.32)",
  cardHover:   "0 4px 20px rgba(108, 99, 255, 0.20)",
  modal:       "0 16px 48px rgba(0,0,0,0.64)",
  glow:        "0 0 0 3px rgba(108, 99, 255, 0.30)",
  glowSuccess: "0 0 0 3px rgba(45, 212, 160, 0.30)",
  glowDanger:  "0 0 0 3px rgba(255, 79, 109, 0.30)",
} as const;

export const transitions = {
  fast:   "120ms ease",
  normal: "200ms ease",
  slow:   "350ms ease",
  spring: "300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
} as const;

export const cssVariables = `
  :root {
    --color-bg:             ${colors.bg};
    --color-surface:        ${colors.surface};
    --color-surface-raised: ${colors.surfaceRaised};
    --color-surface-locked: ${colors.surfaceLocked};
    --color-brand:          ${colors.brand};
    --color-brand-dim:      ${colors.brandDim};
    --color-brand-glow:     ${colors.brandGlow};
    --color-success:        ${colors.success};
    --color-success-dim:    ${colors.successDim};
    --color-warn:           ${colors.warn};
    --color-warn-dim:       ${colors.warnDim};
    --color-danger:         ${colors.danger};
    --color-danger-dim:     ${colors.dangerDim};
    --color-text-primary:   ${colors.textPrimary};
    --color-text-secondary: ${colors.textSecondary};
    --color-text-muted:     ${colors.textMuted};
    --color-text-inverse:   ${colors.textInverse};
    --color-border:         ${colors.border};
    --color-border-focus:   ${colors.borderFocus};
    --font-display: ${typography.fontDisplay};
    --font-body:    ${typography.fontBody};
    --font-mono:    ${typography.fontMono};
    --radius-sm:   ${radius.sm};
    --radius-md:   ${radius.md};
    --radius-lg:   ${radius.lg};
    --radius-full: ${radius.full};
    --shadow-card:         ${shadows.card};
    --shadow-card-hover:   ${shadows.cardHover};
    --shadow-modal:        ${shadows.modal};
    --shadow-glow:         ${shadows.glow};
    --shadow-glow-success: ${shadows.glowSuccess};
    --shadow-glow-danger:  ${shadows.glowDanger};
    --transition-fast:   ${transitions.fast};
    --transition-normal: ${transitions.normal};
    --transition-slow:   ${transitions.slow};
    --transition-spring: ${transitions.spring};
  }
`;
