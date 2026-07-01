import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * <Shell> — Phase 2 layout primitive.
 *
 * Standardizes:
 *  - viewport height (dvh with 100vh fallback)
 *  - fluid gutters (mobile-first)
 *  - container width per variant
 *  - safe-area insets (iOS notch / Android nav bar)
 *
 * Variants control max content width; the shell itself is always
 * full-height and full-width on mobile.
 */

type ShellVariant = "app" | "wide" | "ultra" | "prose" | "full";
type ShellAs = "div" | "main" | "section" | "article";

export interface ShellProps extends HTMLAttributes<HTMLElement> {
  variant?: ShellVariant;
  as?: ShellAs;
  /** Apply fluid vertical padding (gutter-y). Default true. */
  padY?: boolean;
  /** Apply fluid horizontal padding (gutter-x). Default true. */
  padX?: boolean;
  /** Apply full-height viewport (dvh with vh fallback). Default true. */
  minHeight?: boolean;
  /** Respect bottom safe-area (e.g. iOS home indicator). Default true. */
  safeBottom?: boolean;
  /** Respect top safe-area (only for surfaces above the AppLayout header). Default false. */
  safeTop?: boolean;
}

const containerMap: Record<ShellVariant, string> = {
  app: "container-app",
  wide: "container-wide",
  ultra: "container-ultra",
  prose: "container-prose",
  full: "",
};

export const Shell = forwardRef<HTMLElement, ShellProps>(
  (
    {
      variant = "app",
      as = "div",
      padY = true,
      padX = true,
      minHeight = true,
      safeBottom = true,
      safeTop = false,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const Tag = as as any;
    return (
      <Tag
        ref={ref as any}
        className={cn(
          "relative w-full flex flex-col",
          minHeight && "min-h-dvh",
          padX && "gutter-x",
          padY && "gutter-y",
          safeTop && "pt-safe",
          safeBottom && "pb-safe",
          className,
        )}
        {...rest}
      >
        <div className={cn("w-full flex-1", containerMap[variant])}>{children}</div>
      </Tag>
    );
  },
);
Shell.displayName = "Shell";

export default Shell;
