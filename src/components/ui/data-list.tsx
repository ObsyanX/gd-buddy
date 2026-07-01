import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState, type EmptyStateProps } from "@/components/ui/empty-state";
import { ErrorState, type ErrorStateProps } from "@/components/ui/error-state";
import { staggerContainer, staggerItem } from "@/lib/motion";

/**
 * Phase 10 — DataList
 * Unified list surface that resolves the four canonical data states:
 * loading → error → empty → ready. Consumers pass items + renderItem;
 * the component owns the choreography, ARIA, and staggered reveals.
 */
export interface DataListProps<T> {
  items: T[] | null | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => React.Key;
  empty?: Omit<EmptyStateProps, "className">;
  errorProps?: Omit<ErrorStateProps, "error" | "onRetry" | "retrying">;
  skeletonRows?: number;
  className?: string;
  itemClassName?: string;
  as?: "ul" | "ol" | "div";
  ariaLabel?: string;
}

export function DataList<T>({
  items,
  loading,
  error,
  onRetry,
  retrying,
  renderItem,
  keyExtractor,
  empty,
  errorProps,
  skeletonRows = 5,
  className,
  itemClassName,
  as: Wrapper = "ul",
  ariaLabel,
}: DataListProps<T>) {
  const state: "loading" | "error" | "empty" | "ready" = loading
    ? "loading"
    : error
      ? "error"
      : !items || items.length === 0
        ? "empty"
        : "ready";

  return (
    <div className={cn("relative w-full", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {state === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingState variant="list" rows={skeletonRows} />
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ErrorState error={error} onRetry={onRetry} retrying={retrying} {...errorProps} />
          </motion.div>
        )}

        {state === "empty" && empty && (
          <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EmptyState {...empty} />
          </motion.div>
        )}

        {state === "ready" && items && (
          <motion.div
            key="ready"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
          >
            <Wrapper
              aria-label={ariaLabel}
              className={cn(
                Wrapper === "ul" || Wrapper === "ol"
                  ? "list-none divide-y divide-border/50 rounded-2xl glass-1 hairline overflow-hidden"
                  : "flex flex-col gap-3",
              )}
            >
              {items.map((item, i) => (
                <motion.li
                  key={keyExtractor ? keyExtractor(item, i) : i}
                  variants={staggerItem}
                  className={cn(
                    Wrapper === "div" ? "list-none" : "",
                    itemClassName,
                  )}
                  style={Wrapper === "div" ? { listStyle: "none" } : undefined}
                >
                  {renderItem(item, i)}
                </motion.li>
              ))}
            </Wrapper>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
