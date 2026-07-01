import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeRise } from "@/lib/motion";

/**
 * Phase 10 — EmptyState
 * Communicative empty slot for lists, tables, searches, and dashboards.
 * Composes with copper elevation + editorial typography.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void; loading?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: "default" | "compact" | "hero";
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, secondaryAction, variant = "default", className, ...props }, ref) => (
    <motion.div
      ref={ref as never}
      variants={fadeRise}
      initial="hidden"
      animate="show"
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl",
        "glass-1 hairline",
        variant === "compact" && "px-6 py-8 gap-3",
        variant === "default" && "px-8 py-12 gap-4",
        variant === "hero" && "px-10 py-16 gap-5",
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {icon && (
        <div
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-full glass-copper text-primary",
            variant === "compact" ? "size-10" : variant === "hero" ? "size-16" : "size-12",
          )}
        >
          {icon}
        </div>
      )}
      <div className="stack-xs max-w-md">
        <h3
          className={cn(
            "font-editorial text-foreground",
            variant === "compact" ? "text-lg" : variant === "hero" ? "text-3xl" : "text-2xl",
          )}
        >
          {title}
        </h3>
        {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action && (
            <Button onClick={action.onClick} loading={action.loading} size={variant === "compact" ? "sm" : "default"}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size={variant === "compact" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  ),
);
EmptyState.displayName = "EmptyState";
