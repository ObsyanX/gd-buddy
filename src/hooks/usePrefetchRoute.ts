import { useCallback, useRef } from "react";

/**
 * Phase 14 — route prefetch on hover / focus / touchstart.
 *
 * Usage:
 *   const prefetch = usePrefetchRoute(() => import("@/pages/Dashboard"));
 *   <Link to="/home/dashboard" onMouseEnter={prefetch} onFocus={prefetch} />
 *
 * The dynamic import primes Vite's module cache so the chunk is warm by
 * the time the user clicks — measurable INP improvement on nav.
 */
export function usePrefetchRoute(loader: () => Promise<unknown>) {
  const done = useRef(false);
  return useCallback(() => {
    if (done.current) return;
    done.current = true;
    // Fire and forget; swallow errors (offline / chunk-load failure will
    // surface again at real navigation time).
    loader().catch(() => {
      done.current = false;
    });
  }, [loader]);
}
