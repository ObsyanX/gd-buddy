import * as React from "react";

/**
 * Phase 13 — Live Region announcer
 *
 * A single global pair of ARIA live regions ("polite" and "assertive")
 * plus a `useAnnouncer` hook so any component can push a message to
 * screen readers without rendering visible UI.
 *
 * Usage:
 *   <Announcer />              // once, at the app root
 *   const say = useAnnouncer(); say("Session saved");
 *   say("Recording failed", "assertive");
 */

type Politeness = "polite" | "assertive";
type Listener = (msg: string, level: Politeness) => void;

const listeners = new Set<Listener>();

export function useAnnouncer() {
  return React.useCallback((message: string, level: Politeness = "polite") => {
    if (!message) return;
    for (const l of listeners) l(message, level);
  }, []);
}

const HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Mount once (e.g., inside AppLayout). Safe to render multiple; each attaches its own listener. */
export function Announcer() {
  const [polite, setPolite] = React.useState("");
  const [assertive, setAssertive] = React.useState("");

  React.useEffect(() => {
    const listener: Listener = (msg, level) => {
      // Clear then set so identical repeated messages still fire.
      if (level === "assertive") {
        setAssertive("");
        requestAnimationFrame(() => setAssertive(msg));
      } else {
        setPolite("");
        requestAnimationFrame(() => setPolite(msg));
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" style={HIDDEN}>
        {polite}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" style={HIDDEN}>
        {assertive}
      </div>
    </>
  );
}
