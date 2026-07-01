import * as React from "react";

/**
 * Phase 13 — useRovingTabIndex
 *
 * Composable roving-tabindex controller for custom composite widgets
 * (toolbars, chip groups, segmented controls). Only the "active" item is
 * in the tab order; arrow keys move focus between siblings.
 *
 * Follows APG toolbar / listbox conventions:
 *   - Home/End jump to first/last
 *   - ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical) move by one
 *   - Wraps at edges by default
 *
 * NOTE: For dropdowns, menus, and tabs, prefer Radix — this is for
 * bespoke composites that Radix doesn't cover.
 */
export type Orientation = "horizontal" | "vertical" | "both";

export interface RovingTabIndexOptions {
  count: number;
  orientation?: Orientation;
  loop?: boolean;
  initialIndex?: number;
  onActivate?: (index: number) => void;
}

export function useRovingTabIndex({
  count,
  orientation = "horizontal",
  loop = true,
  initialIndex = 0,
  onActivate,
}: RovingTabIndexOptions) {
  const [active, setActive] = React.useState(initialIndex);
  const refs = React.useRef<Array<HTMLElement | null>>([]);

  React.useEffect(() => {
    if (active >= count && count > 0) setActive(count - 1);
  }, [count, active]);

  const focusIndex = React.useCallback((next: number) => {
    setActive(next);
    // Focus deferred so React can render tabIndex updates first.
    requestAnimationFrame(() => refs.current[next]?.focus());
  }, []);

  const move = React.useCallback(
    (delta: number) => {
      if (count === 0) return;
      let next = active + delta;
      if (next < 0) next = loop ? count - 1 : 0;
      if (next >= count) next = loop ? 0 : count - 1;
      focusIndex(next);
    },
    [active, count, loop, focusIndex],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const isHorizontal = orientation === "horizontal" || orientation === "both";
      const isVertical = orientation === "vertical" || orientation === "both";
      switch (e.key) {
        case "ArrowRight":
          if (!isHorizontal) return;
          e.preventDefault();
          move(1);
          break;
        case "ArrowLeft":
          if (!isHorizontal) return;
          e.preventDefault();
          move(-1);
          break;
        case "ArrowDown":
          if (!isVertical) return;
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          if (!isVertical) return;
          e.preventDefault();
          move(-1);
          break;
        case "Home":
          e.preventDefault();
          focusIndex(0);
          break;
        case "End":
          e.preventDefault();
          focusIndex(count - 1);
          break;
        case "Enter":
        case " ":
          onActivate?.(active);
          break;
      }
    },
    [orientation, move, focusIndex, count, active, onActivate],
  );

  const getItemProps = React.useCallback(
    (index: number) => ({
      ref: (node: HTMLElement | null) => {
        refs.current[index] = node;
      },
      tabIndex: index === active ? 0 : -1,
      "data-active": index === active ? "" : undefined,
      onFocus: () => setActive(index),
      onKeyDown,
    }),
    [active, onKeyDown],
  );

  return { active, setActive: focusIndex, getItemProps };
}
