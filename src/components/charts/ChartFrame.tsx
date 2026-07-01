import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";
import { ErrorState, type ErrorStateProps } from "@/components/ui/error-state";
import { fadeRise } from "@/lib/motion";

/**
 * Phase 11.5 — ChartFrame
 * Unified wrapper that resolves the four canonical data states around any
 * chart child. Composes the Phase 10 state primitives so charts inherit the
 * same choreography as lists and tables.
 *
 * Usage:
 *   <ChartFrame loading={q.isLoading} error={q.error} empty={!data?.length}
 *     emptyProps={{ title: "No sessions yet", description: "..." }}
 *     onRetry={q.refetch}
 *   >
 *     <MetricArea data={data} xKey="date" yKey="score" />
 *   </ChartFrame>
 */
export interface ChartFrameProps {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  emptyProps?: Omit<EmptyStateProps, "className">;
  errorProps?: Omit<ErrorStateProps, "error" | "onRetry" | "retrying">;
  height?: number;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}

export function ChartFrame({
  loading,
  error,
  empty,
  onRetry,
  retrying,
  title,
  description,
  actions,
  emptyProps,
  errorProps,
  height = 260,
  className,
  bodyClassName,
  children,
  ariaLabel,
}: ChartFrameProps) {
  const state: "loading" | "error" | "empty" | "ready" = loading
    ? "loading"
    : error
      ? "error"
      : empty
        ? "empty"
        : "ready";

  return (
    <section
      aria-label={ariaLabel ?? (typeof title === "string" ? title : "chart")}
      aria-busy={loading || undefined}
      className={cn(
        "relative rounded-2xl glass-1 hairline overflow-hidden",
        "elev-md",
        className,
      )}
    >
      {(title || description || actions) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && (
              <h3 className="font-editorial text-base sm:text-lg text-foreground text-balance">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}

      <div
        className={cn("relative px-2 pb-2 pt-3 sm:px-3 sm:pb-3", bodyClassName)}
        style={{ minHeight: height }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3"
            >
              <LoadingState variant="panel" />
            </motion.div>
          )}

          {state === "error" && (
            <motion.div key="error" variants={fadeRise} initial="hidden" animate="show" exit="exit" className="p-3">
              <ErrorState
                error={error}
                onRetry={onRetry}
                retrying={retrying}
                variant="compact"
                {...errorProps}
              />
            </motion.div>
          )}

          {state === "empty" && (
            <motion.div key="empty" variants={fadeRise} initial="hidden" animate="show" exit="exit" className="p-3">
              <EmptyState
                variant="compact"
                title={emptyProps?.title ?? "No data yet"}
                description={
                  emptyProps?.description ?? "Once activity is recorded, it will appear here."
                }
                {...emptyProps}
              />
            </motion.div>
          )}

          {state === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
