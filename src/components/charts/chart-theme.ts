import type React from "react";

/**
 * Recharts theming constants. Copper for the primary series plus a teal
 * cost accent so margin charts don't read as monotone orange. Grid and
 * text colors pull from CSS vars so they flip correctly in dark mode.
 */

export const CHART_COLORS = {
  primary: "#f27a1a",
  primaryLight: "#fba85c",
  primaryFaint: "rgba(242, 122, 26, 0.12)",
  primaryGradientStart: "rgba(242, 122, 26, 0.35)",
  primaryGradientEnd: "rgba(242, 122, 26, 0.02)",
  /** Cost / margin accent — teal. Contrasts with copper. */
  cost: "#22a6b3",
  costLight: "#4fc3cf",
  costFaint: "rgba(34, 166, 179, 0.14)",
  costGradientStart: "rgba(34, 166, 179, 0.32)",
  costGradientEnd: "rgba(34, 166, 179, 0.02)",
  prior: "#a3a3a3",
  priorFaint: "rgba(163, 163, 163, 0.1)",
  success: "#16a34a",
  warning: "#eab308",
  danger: "#dc2626",
  info: "#0891b2",
  muted: "#d4d4d4",
  /** Grid uses CSS var via color-mix in components; raw fallback here. */
  grid: "rgba(115, 115, 115, 0.18)",
  gridDark: "rgba(229, 229, 229, 0.08)",
  /** Text color — reads the muted-foreground token so dark mode flips. */
  text: "var(--muted-foreground)",
  textDark: "var(--muted-foreground)",
} as const;

/** Standard Recharts axis tick styling — uses CSS var for the fill. */
export const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: "Inter, system-ui, sans-serif",
  fill: "currentColor",
} as const;

/** Standard tooltip styling — matches popover surfaces. */
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "8px 12px",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
  fontFamily: "Inter, system-ui, sans-serif",
  color: "var(--foreground)",
};
