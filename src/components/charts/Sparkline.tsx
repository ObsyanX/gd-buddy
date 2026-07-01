import * as React from "react";
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { chartColor } from "@/lib/chart-theme";

/**
 * Phase 11 — Sparkline
 * Compact trend line for KPI cards. No axes, no grid — pure signal.
 */
export interface SparklineProps {
  data: Array<number | { value: number }>;
  color?: string;
  height?: number;
  width?: string | number;
  strokeWidth?: number;
  showDot?: boolean;
  className?: string;
  ariaLabel?: string;
  formatter?: (v: number) => string;
}

export function Sparkline({
  data,
  color = chartColor.primary,
  height = 40,
  width = "100%",
  strokeWidth = 1.75,
  showDot = true,
  className,
  ariaLabel,
  formatter,
}: SparklineProps) {
  const normalized = React.useMemo(
    () =>
      data.map((d, i) => (typeof d === "number" ? { i, value: d } : { i, value: d.value })),
    [data],
  );

  return (
    <div className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={normalized} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip
            cursor={false}
            wrapperStyle={{ outline: "none" }}
            contentStyle={{ display: "none" }}
            formatter={(v) => (formatter ? formatter(v as number) : v)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={
              showDot
                ? {
                    r: 3,
                    fill: color,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }
                : false
            }
            isAnimationActive
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
