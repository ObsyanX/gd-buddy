import * as React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeRise } from "@/lib/motion";

/**
 * Phase 10 — ErrorState
 * Failure surface for lists, tables, and data-fetch panels.
 */
export interface ErrorStateProps extends Omit<HTMLMotionProps<"div">, "title"> {
  title?: string;
  description?: React.ReactNode;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  variant?: "default" | "compact";
  hideDetails?: boolean;
}

function extractMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return null;
}

export const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title = "Something went wrong",
      description = "We couldn't load this data. Please try again.",
      error,
      onRetry,
      retryLabel = "Retry",
      retrying,
      variant = "default",
      hideDetails,
      className,
      ...props
    },
    ref,
  ) => {
    const detail = hideDetails ? null : extractMessage(error);
    return (
      <motion.div
        ref={ref}
        variants={fadeRise}
        initial="hidden"
        animate="show"
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex flex-col items-center justify-center text-center rounded-2xl hairline",
          "bg-destructive/5 border-destructive/20",
          variant === "compact" ? "px-6 py-8 gap-3" : "px-8 py-12 gap-4",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className={cn(
            "flex items-center justify-center rounded-full bg-destructive/10 text-destructive",
            variant === "compact" ? "size-10" : "size-12",
          )}
        >
          <AlertTriangle className={variant === "compact" ? "size-5" : "size-6"} />
        </div>
        <div className="stack-xs max-w-md">
          <h3 className={cn("font-editorial text-foreground", variant === "compact" ? "text-lg" : "text-2xl")}>
            {title}
          </h3>
          {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
          {detail && (
            <p className="text-xs font-mono text-destructive/80 break-all pt-1" data-testid="error-detail">
              {detail}
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            loading={retrying}
            leftIcon={<RefreshCcw className="size-4" />}
            size={variant === "compact" ? "sm" : "default"}
          >
            {retryLabel}
          </Button>
        )}
      </motion.div>
    );
  },
);
ErrorState.displayName = "ErrorState";
