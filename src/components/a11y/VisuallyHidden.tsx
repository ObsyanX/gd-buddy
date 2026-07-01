import * as React from "react";

/**
 * Phase 13 — VisuallyHidden
 * Content available only to assistive tech. Use for supplemental context
 * that would clutter the visual layout (e.g., loading counts, form errors
 * that already appear inline, decorative-adjacent labels).
 */
export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: keyof JSX.IntrinsicElements;
  /** When true, becomes visible on focus (used by SkipLink-style patterns). */
  focusable?: boolean;
}

const HIDDEN_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export const VisuallyHidden = React.forwardRef<HTMLElement, VisuallyHiddenProps>(
  ({ as = "span", focusable, style, ...props }, ref) => {
    const Comp = as as unknown as React.ElementType;
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        style={{ ...HIDDEN_STYLE, ...style }}
        data-focusable={focusable ? "" : undefined}
        {...props}
      />
    );
  },
);
VisuallyHidden.displayName = "VisuallyHidden";
