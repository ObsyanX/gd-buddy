import * as React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartColor, chartSeries } from "@/lib/chart-theme";
import { ChartTooltipContent } from "./ChartTooltip";

/**
 * Phase 11 — ScoreRadar
 * Multi-axis competency chart. Supports 1..N series (e.g. "You" vs "Cohort avg").
 * All axes are 0..max (default 100).
 */
export interface RadarSeries {
  name: string;
  color?: string;
  data: Record<string, number>;
}

export interface ScoreRadarProps {
  axes: string[];
  series: RadarSeries[];
  max?: number;
  height?: number;
  className?: string;
  showLegend?: boolean;
  ariaLabel?: string;
}

export function ScoreRadar({
  axes,
  series,
  max = 100,
  height = 300,
  className,
  showLegend = true,
  ariaLabel,
}: ScoreRadarProps) {
  const rows = React.useMemo(() => {
    return axes.map((axis) => {
      const row: Record<string, number | string> = { axis };
      for (const s of series) row[s.name] = s.data[axis] ?? 0;
      return row;
    });
  }, [axes, series]);

  return (
    <div className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border) / 0.5)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, max]}
            tick={{ fill: "hsl(var(--muted-foreground) / 0.7)", fontSize: 9 }}
            axisLine={false}
            tickCount={5}
          />
          <Tooltip content={<ChartTooltipContent unit="/100" />} />
          {showLegend && (
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            />
          )}
          {series.map((s, i) => {
            const color = s.color ?? chartSeries[i % chartSeries.length] ?? chartColor.primary;
            return (
              <Radar
                key={s.name}
                name={s.name}
                dataKey={s.name}
                stroke={color}
                fill={color}
                fillOpacity={0.22}
                strokeWidth={2}
                isAnimationActive
                animationDuration={800}
              />
            );
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
