import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { cartesianDefaults, chartColor } from "@/lib/chart-theme";
import { ChartTooltipContent } from "./ChartTooltip";

/**
 * Phase 11 — MetricArea
 * Editorial area chart with gradient fill, glass tooltip, and copper accents.
 * Ideal for time-series KPIs: sessions, XP, engagement, latency, etc.
 */
export interface MetricAreaProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
  yFormatter?: (v: number) => string;
  xFormatter?: (v: T[keyof T]) => string;
  target?: number;
  unit?: string;
  className?: string;
  gradientId?: string;
  strokeWidth?: number;
  ariaLabel?: string;
}

export function MetricArea<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = chartColor.primary,
  height = 220,
  showGrid = true,
  showAxis = true,
  yFormatter,
  xFormatter,
  target,
  unit,
  className,
  gradientId,
  strokeWidth = 2,
  ariaLabel,
}: MetricAreaProps<T>) {
  const gid = React.useId();
  const fillId = `metric-fill-${gradientId ?? gid.replace(/:/g, "")}`;

  return (
    <div className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid {...cartesianDefaults.grid} />}
          {showAxis && (
            <>
              <XAxis
                dataKey={xKey}
                {...cartesianDefaults.axis}
                tickFormatter={xFormatter as (v: unknown) => string}
                minTickGap={16}
              />
              <YAxis
                {...cartesianDefaults.axis}
                width={36}
                tickFormatter={yFormatter as (v: number) => string}
              />
            </>
          )}
          <Tooltip
            cursor={cartesianDefaults.tooltipCursor}
            content={<ChartTooltipContent unit={unit} />}
          />
          {typeof target === "number" && (
            <ReferenceLine
              y={target}
              stroke={chartColor.primaryGlow}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{
                value: `Target ${target}${unit ?? ""}`,
                position: "insideTopRight",
                fill: chartColor.muted,
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={`url(#${fillId})`}
            activeDot={{
              r: 5,
              fill: color,
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
