import * as React from "react";

/**
 * Phase 13 — useKeyPress
 *
 * Ergonomic keyboard-shortcut binder that respects text-input contexts.
 * Complements the existing feature-specific `useKeyboardShortcuts` hook.
 *
 *   useKeyPress("Escape", () => close());
 *   useKeyPress(["mod+k", "ctrl+k"], (e) => { e.preventDefault(); open(); });
 *
 * Convention:
 *   - "mod" = ⌘ on macOS, Ctrl elsewhere.
 *   - Combos are lowercase and separated by "+".
 *   - By default, shortcuts DO fire when focus is inside an input if they
 *     use a modifier (Ctrl/Cmd). Set `allowInInput: true` to always fire.
 */

type Handler = (e: KeyboardEvent) => void;
type Keys = string | string[];

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

function normalize(combo: string): string {
  return combo
    .toLowerCase()
    .split("+")
    .map((k) => k.trim())
    .map((k) => (k === "mod" ? (isMac ? "meta" : "ctrl") : k))
    .sort()
    .join("+");
}

function eventCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.metaKey) parts.push("meta");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  const k = e.key?.toLowerCase();
  if (k && !["control", "meta", "shift", "alt"].includes(k)) parts.push(k);
  return parts.sort().join("+");
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export interface UseKeyPressOptions {
  enabled?: boolean;
  allowInInput?: boolean;
  preventDefault?: boolean;
  target?: React.RefObject<HTMLElement> | Window | Document;
}

export function useKeyPress(keys: Keys, handler: Handler, options: UseKeyPressOptions = {}) {
  const { enabled = true, allowInInput = false, preventDefault = false, target } = options;
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  React.useEffect(() => {
    if (!enabled) return;
    const wanted = new Set((Array.isArray(keys) ? keys : [keys]).map(normalize));

    const onKey = (e: KeyboardEvent) => {
      if (!allowInInput && !e.ctrlKey && !e.metaKey && isEditable(e.target)) return;
      if (!wanted.has(eventCombo(e))) return;
      if (preventDefault) e.preventDefault();
      handlerRef.current(e);
    };

    const node: EventTarget =
      target && "current" in target
        ? (target.current ?? window)
        : (target as EventTarget | undefined) ?? window;

    node.addEventListener("keydown", onKey as EventListener);
    return () => node.removeEventListener("keydown", onKey as EventListener);
  }, [enabled, allowInInput, preventDefault, target, Array.isArray(keys) ? keys.join("|") : keys]);
}
