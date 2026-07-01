import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import { ReactNode } from "react";

/**
 * Phase 14 — Framer Motion tree-shaking.
 * Wraps the app in `LazyMotion` with the `domAnimation` feature bundle
 * (~15 kB vs. ~34 kB for the full `domMax`). All existing `motion.*`
 * usage keeps working; only `<m.*>` is required for deeper savings.
 *
 * Also honors OS-level `prefers-reduced-motion` via `MotionConfig`.
 */
export function LazyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
