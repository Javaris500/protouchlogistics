/**
 * Recharts theming constants. Copper for primary series,
 * opacity variants for multi-series, semantic colors for thresholds.
 *
 * Use getComputedStyle to read CSS variables at runtime so charts
 * respond to light/dark mode changes.
 */

export const CHART_COLORS = {
  primary: "#f27a1a",
  primaryLight: "#fba85c",
  primaryFaint: "rgba(242, 122, 26, 0.12)",
  primaryGradientStart: "rgba(242, 122, 26, 0.35)",
  primaryGradientEnd: "rgba(242, 122, 26, 0.02)",
  prior: "#a3a3a3",
  priorFaint: "rgba(163, 163, 163, 0.10)",
  success: "#16a34a",
  warning: "#eab308",
  danger: "#dc2626",
  info: "#0891b2",
  muted: "#d4d4d4",
  grid: "rgba(0, 0, 0, 0.06)",
  gridDark: "rgba(255, 255, 255, 0.06)",
  text: "#525252",
  textDark: "#a3a3a3",
} as const;

/** Standard Recharts axis tick styling */
export const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: "Inter, system-ui, sans-serif",
  fill: CHART_COLORS.text,
} as const;

/** Standard tooltip styling */
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "8px 12px",
  boxShadow: "var(--shadow-md)",
  fontSize: 12,
  fontFamily: "Inter, system-ui, sans-serif",
};

import type React from "react";
