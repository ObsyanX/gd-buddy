import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scoreToBand } from "@/lib/chart-theme";

/**
 * Phase 11 — ProgressRing
 * SVG circular progress with copper gradient, tokenized colors, and a
 * spring-driven arc animation. Perfect for score cards and completion states.
 */
export interface ProgressRingProps {
  value: number; // 0..max
  max?: number;
  size?: number; // px
  thickness?: number; // px
  color?: string; // override auto-band
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  showValue?: boolean;
  valueSuffix?: string;
  className?: string;
  ariaLabel?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  thickness = 10,
  color,
  trackColor = "hsl(var(--border) / 0.5)",
  label,
  sublabel,
  showValue = true,
  valueSuffix = "",
  className,
  ariaLabel,
}: ProgressRingProps) {
  const prefersReduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(value, max));
  const pct = clamped / max;
  const stroke = color ?? scoreToBand(pct * 100);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const gid = React.useId().replace(/:/g, "");

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel ?? (typeof label === "string" ? label : "progress")}
    >
      <svg width={size} height={size} className="-rotate-90 gpu">
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.95} />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${gid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 90, damping: 20, mass: 0.9 }
          }
        />
      </svg>
      {(showValue || label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {showValue && (
            <span
              className="font-editorial tabular-nums text-foreground"
              style={{ fontSize: Math.max(14, size / 4.5) }}
            >
              {Math.round(clamped)}
              {valueSuffix && (
                <span className="ml-0.5 text-muted-foreground" style={{ fontSize: size / 8 }}>
                  {valueSuffix}
                </span>
              )}
            </span>
          )}
          {label && (
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          )}
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
