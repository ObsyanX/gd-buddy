import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 11 — Chart tooltip
 * Reusable glass tooltip content for recharts. Consumers pass this as
 * `content={<ChartTooltipContent />}` on a <Tooltip /> component.
 *
 * Kept intentionally lightweight — the shadcn chart wrapper still owns
 * the deeper theming for kpi dashboards.
 */
export interface ChartTooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: React.ReactNode;
  valueFormatter?: (value: number | string, item: ChartTooltipItem) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  unit?: string;
}

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ active, payload, label, valueFormatter, labelFormatter, className, hideLabel, unit }, ref) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "pointer-events-none min-w-[10rem] rounded-xl glass-2 hairline",
          "px-3 py-2 text-xs shadow-[var(--shadow-elev-lg,0_20px_40px_-20px_hsl(var(--primary)/0.35))]",
          "animate-in fade-in-0 zoom-in-95",
          className,
        )}
      >
        {!hideLabel && label !== undefined && (
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        <ul className="space-y-1">
          {payload.map((item, i) => {
            const val =
              item.value === undefined
                ? "—"
                : valueFormatter
                  ? valueFormatter(item.value, item)
                  : typeof item.value === "number"
                    ? item.value.toLocaleString()
                    : item.value;
            return (
              <li key={i} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full ring-2 ring-background/60"
                  style={{ background: item.color }}
                />
                {item.name && <span className="text-muted-foreground">{item.name}</span>}
                <span className="ml-auto font-medium tabular-nums text-foreground">
                  {val}
                  {unit && <span className="ml-0.5 text-muted-foreground">{unit}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";
