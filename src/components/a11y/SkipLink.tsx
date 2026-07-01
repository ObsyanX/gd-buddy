import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Phase 13 — SkipLink
 * WCAG 2.4.1 "Bypass Blocks". Renders an offscreen link that becomes
 * visible on focus so keyboard users can jump to <main>. Place as the
 * very first focusable element in the app shell.
 */
export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
}

export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ targetId = "main-content", className, children = "Skip to main content", ...props }, ref) => (
    <a
      ref={ref}
      href={`#${targetId}`}
      className={cn(
        // Off-screen by default; slides in on focus
        "sr-only focus:not-sr-only",
        "focus:fixed focus:left-4 focus:top-4 focus:z-[100]",
        "focus:inline-flex focus:items-center focus:rounded-lg",
        "focus:glass-2 focus:hairline focus:px-4 focus:py-2",
        "focus:text-sm focus:font-medium focus:text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  ),
);
SkipLink.displayName = "SkipLink";
