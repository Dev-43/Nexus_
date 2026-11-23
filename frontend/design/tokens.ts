// ============================================================
// Nexus Design Tokens
// Single source of truth — every component imports from here.
// Never use ad-hoc Tailwind color/spacing classes anywhere.
// ============================================================

export const colors = {
  // Backgrounds - TRUE BLACK OLED PALETTE
  bg:           "#000000",   // true pure black background
  surface:      "#080A0E",   // card / panel base
  surfaceRaised:"#11141D",   // elevated card, modal, active state
  surfaceLocked:"#040507",   // locked level card bg

  // Brand from User Palette (#4CB1FF, #9C7BAC, #FF7F2D, #7CB078, #D0E6FF, #4A4B4B)
  brand:        "#4CB1FF",   // vibrant cyan-blue — primary actions, active states
  brandDim:     "#153C5C",   // brand pressed / active bg
  brandGlow:    "rgba(76, 177, 255, 0.28)", // cyan-blue glow shadow

  // Accents from Palette
  accentPurple: "#9C7BAC",   // orchid lavender
  accentOrange: "#FF7F2D",   // vibrant orange
  accentSage:   "#7CB078",   // sage green
  accentIce:    "#D0E6FF",   // ice blue highlight
  accentSlate:  "#4A4B4B",   // dark charcoal / slate

  // Semantic
  success:      "#7CB078",   // sage green — pass, correct, complete
  successDim:   "rgba(124, 176, 120, 0.18)",
  warn:         "#FF7F2D",   // orange — partial credit, caution
  warnDim:      "rgba(255, 127, 45, 0.18)",
  danger:       "#FF4F6D",   // fail, wrong, error
  dangerDim:    "rgba(255, 79, 109, 0.16)",

  // Text
  textPrimary:  "#F2F8FC",   // crisp cool white from user palette
  textSecondary:"#9EAABF",   // soft readable slate
  textMuted:    "#556073",
  textInverse:  "#000000",   // true black text on light buttons

  // Border
  border:       "#1F2430",
  borderFocus:  "#4CB1FF",
  borderSlate:  "#4A4B4B",

  // Badge tier colors (mapped to palette)
  badge: {
    bronze:  { bg: "#2A180E", accent: "#FF7F2D", text: "#FEF6F4" },
    silver:  { bg: "#161D24", accent: "#D0E6FF", text: "#F2F8FC" },
    gold:    { bg: "#281E10", accent: "#FF7F2D", text: "#FFECAA" },
    diamond: { bg: "#0D2132", accent: "#4CB1FF", text: "#D0E6FF" },
    purple:  { bg: "#231828", accent: "#9C7BAC", text: "#F5F6FC" },
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
