import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Phase 10 — LoadingState
 * Skeleton compositions for common data-display surfaces:
 * - `list`   → repeated row skeletons with avatar + two text lines
 * - `table`  → header + body rows matching column count
 * - `cards`  → grid of card skeletons
 * - `panel`  → single block for hero/summary areas
 */
export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "list" | "table" | "cards" | "panel";
  rows?: number;
  columns?: number;
  showAvatar?: boolean;
  label?: string;
}

export const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ variant = "list", rows = 5, columns = 4, showAvatar = true, label = "Loading…", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn("w-full", className)}
        {...props}
      >
        <span className="sr-only">{label}</span>

        {variant === "panel" && (
          <div className="rounded-2xl glass-1 hairline p-6 space-y-4">
            <Skeleton shape="text" className="w-1/3 h-5" shimmer />
            <Skeleton className="h-32 w-full" shimmer />
            <div className="flex gap-2">
              <Skeleton shape="pill" className="h-7 w-20" shimmer />
              <Skeleton shape="pill" className="h-7 w-24" shimmer />
            </div>
          </div>
        )}

        {variant === "list" && (
          <ul className="rounded-2xl glass-1 hairline divide-y divide-border/50 overflow-hidden">
            {Array.from({ length: rows }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 p-4">
                {showAvatar && <Skeleton shape="circle" className="size-10 shrink-0" shimmer />}
                <div className="flex-1 space-y-2">
                  <Skeleton shape="text" className="h-4 w-2/5" shimmer />
                  <Skeleton shape="text" className="h-3 w-3/5" shimmer />
                </div>
                <Skeleton shape="pill" className="h-6 w-16 hidden sm:block" shimmer />
              </li>
            ))}
          </ul>
        )}

        {variant === "table" && (
          <div className="rounded-2xl hairline overflow-hidden">
            <div
              className="grid gap-4 border-b border-border/60 bg-muted/40 px-4 py-3"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} shape="text" className="h-3 w-2/3" shimmer />
              ))}
            </div>
            <div className="divide-y divide-border/50">
              {Array.from({ length: rows }).map((_, r) => (
                <div
                  key={r}
                  className="grid gap-4 px-4 py-4"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: columns }).map((_, c) => (
                    <Skeleton key={c} shape="text" className="h-4 w-4/5" shimmer />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {variant === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="rounded-2xl glass-1 hairline p-5 space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" shimmer />
                <Skeleton shape="text" className="h-4 w-3/4" shimmer />
                <Skeleton shape="text" className="h-3 w-full" shimmer />
                <Skeleton shape="text" className="h-3 w-2/3" shimmer />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
LoadingState.displayName = "LoadingState";
