import { useRef } from "react";

/**
 * Keeps the first non-empty value a route received.
 *
 * React Router keeps the outgoing page mounted for one extra commit while the
 * next lazy route resolves. During that commit `useLocation().state` /
 * `useParams()` already reflect the NEW url, so naive "redirect if missing"
 * guards fire and bounce the user back. Sticky values prevent that: once a
 * page has seen a value, it never observes it as missing again.
 */
export function useStickyRouteValue<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(null);
  if (value !== undefined && value !== null) ref.current = value as T;
  return ref.current;
}
