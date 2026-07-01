/**
 * Phase 11 — Chart Theme
 * Tokenized recharts palette + shared props for GD Buddy's sienna glass system.
 * Every color reads from a semantic CSS variable so light/dark and future
 * themes recolor without touching chart code.
 */

// Semantic HSL(var()) refs — safe for stroke/fill props on SVG
export const chartColor = {
  primary: "hsl(var(--primary))",
  primaryGlow: "hsl(var(--primary-glow))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
  ring: "hsl(var(--ring))",
  foreground: "hsl(var(--foreground))",
} as const;

// Ordered series palette — use for categorical charts (bars, pies, radar layers)
export const chartSeries = [
  chartColor.primary,
  chartColor.primaryGlow,
  chartColor.secondary,
  chartColor.accent,
  chartColor.success,
  chartColor.warning,
] as const;

// Semantic score bands used across radar / progress visuals
export const chartBands = {
  poor: chartColor.destructive,
  fair: chartColor.warning,
  good: chartColor.primaryGlow,
  excellent: chartColor.success,
} as const;

/** Shared axis / grid props for cartesian charts */
export const cartesianDefaults = {
  grid: {
    stroke: "hsl(var(--border) / 0.4)",
    strokeDasharray: "3 4",
    vertical: false as const,
  },
  axis: {
    stroke: "hsl(var(--border) / 0.6)",
    tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
    tickLine: false as const,
    axisLine: false as const,
  },
  tooltipCursor: {
    stroke: "hsl(var(--primary) / 0.5)",
    strokeWidth: 1,
    strokeDasharray: "2 3",
  },
} as const;

/** Utility for computing a stop-based linear gradient for area/line fills */
export function gradientStops(color: string, opacityTop = 0.35, opacityBottom = 0) {
  return [
    { offset: "0%", color, opacity: opacityTop },
    { offset: "100%", color, opacity: opacityBottom },
  ];
}

/** Map a 0-100 score to a semantic band color */
export function scoreToBand(score: number): string {
  if (score >= 85) return chartBands.excellent;
  if (score >= 70) return chartBands.good;
  if (score >= 50) return chartBands.fair;
  return chartBands.poor;
}
