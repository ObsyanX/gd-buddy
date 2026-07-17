import * as React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ArrowUpRight as ExternalIcon, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { chartColor } from "@/lib/chart-theme";
import { trackStatCardClick, type StatCardTracking } from "@/lib/track-stat-card";

/**
 * Phase 11 — StatCard
 * KPI card composing label, big value, delta chip, and optional sparkline.
 * Uses copper glass elevation and tabular numerics for scannable dashboards.
 */
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: number; // percentage change vs previous window (-100..∞)
  deltaLabel?: string; // e.g. "vs last week"
  invertDelta?: boolean; // when a decrease is "good" (e.g. latency)
  trend?: number[]; // sparkline data
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  /** When provided, the card becomes a clickable link to this route. */
  href?: string;
  /** Optional click handler; used with or instead of href. */
  onClick?: () => void;
  /** Tooltip / aria-label describing where the card leads. */
  hint?: string;
}

function formatDelta(delta: number) {
  const abs = Math.abs(delta);
  const rounded = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${rounded}%`;
}


export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, unit, delta, deltaLabel, invertDelta, trend, icon, loading, className, href, onClick, hint }, ref) => {
    const isFlat = delta === undefined || delta === 0;
    const isPositive = delta !== undefined && delta > 0;
    const good = invertDelta ? !isPositive : isPositive;
    const deltaColor = isFlat
      ? "text-muted-foreground"
      : good
        ? "text-[hsl(var(--success))]"
        : "text-[hsl(var(--destructive))]";
    const DeltaIcon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
    const interactive = Boolean(href || onClick);

    const inner = (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden rounded-2xl glass-1 hairline p-4 sm:p-5",
          "elev-md lift focus-ring h-full",
          interactive && "cursor-pointer transition-transform hover:-translate-y-0.5 hover:elev-lg group",
          loading && "animate-pulse",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-editorial text-2xl sm:text-3xl tabular-nums text-foreground">
                {value}
              </span>
              {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
            </div>
            {delta !== undefined && (
              <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", deltaColor)}>
                <DeltaIcon className="size-3.5" aria-hidden />
                <span className="tabular-nums">{formatDelta(delta)}</span>
                {deltaLabel && (
                  <span className="text-muted-foreground font-normal">{deltaLabel}</span>
                )}
              </div>
            )}
          </div>
          {icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl glass-copper text-primary">
              {icon}
            </div>
          ) : interactive ? (
            <ExternalIcon
              className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          ) : null}
        </div>
        {trend && trend.length > 1 && (
          <div className="mt-3 -mx-1">
            <Sparkline
              data={trend}
              color={good || isFlat ? chartColor.primary : chartColor.destructive}
              height={44}
              ariaLabel={`${label} trend`}
            />
          </div>
        )}
      </motion.div>
    );

    if (href) {
      return (
        <Link
          to={href}
          onClick={onClick}
          aria-label={hint ? `${label} — ${hint}` : `View ${label} details`}
          title={hint}
          className="block rounded-2xl focus-ring"
        >
          {inner}
        </Link>
      );
    }
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-label={hint ? `${label} — ${hint}` : label}
          title={hint}
          className="block w-full text-left rounded-2xl focus-ring"
        >
          {inner}
        </button>
      );
    }
    return inner;
  },
);
StatCard.displayName = "StatCard";
