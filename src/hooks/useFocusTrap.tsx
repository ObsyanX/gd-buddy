import * as React from "react";

/**
 * Phase 13 — useFocusTrap
 *
 * Lightweight focus trap for bespoke overlays. Prefer Radix Dialog/Sheet
 * (which already trap correctly) — this hook exists only for custom
 * surfaces (e.g. floating video PiP, drag-drop palettes) where Radix
 * isn't appropriate.
 *
 *   const ref = useFocusTrap<HTMLDivElement>(open);
 *   <div ref={ref}>...</div>
 *
 * Behaviour:
 *   - On activation, focuses the first tabbable descendant (or the
 *     container itself if none exist).
 *   - Tab / Shift+Tab wraps inside the container.
 *   - Restores focus to the previously active element on deactivate.
 *   - Escape key is NOT handled here; wire it to your close handler.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("data-focus-trap-skip") && el.offsetParent !== null,
  );
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active: boolean,
  options: { restoreOnDeactivate?: boolean; initialFocus?: React.RefObject<HTMLElement> } = {},
) {
  const { restoreOnDeactivate = true, initialFocus } = options;
  const containerRef = React.useRef<T | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusables = getTabbable(node);
    const initial = initialFocus?.current ?? focusables[0] ?? node;
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    initial?.focus({ preventScroll: true });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getTabbable(node);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", handleKey);
    return () => {
      node.removeEventListener("keydown", handleKey);
      if (restoreOnDeactivate) previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [active, initialFocus, restoreOnDeactivate]);

  return containerRef;
}
