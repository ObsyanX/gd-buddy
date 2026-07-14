// Startup healthcheck: detects duplicate React copies / null dispatcher
// (the root cause of "Cannot read properties of null (reading 'useEffect')").
import * as React from "react";

type Marker = { version: string; instances: number };

const GLOBAL_KEY = "__GD_REACT_MARKER__";
const RESET_FLAG = "__vite_dep_reset";
const RESET_STORAGE_KEY = "gd:last-vite-reset";

export interface HealthReport {
  ok: boolean;
  reason?: "duplicate-react" | "null-dispatcher";
  detail?: string;
  reactVersion: string;
}

function readDispatcher(): unknown {
  // React 18 stores the active hooks dispatcher on a well-known secret internal.
  const internals =
    (React as unknown as {
      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
        ReactCurrentDispatcher?: { current?: unknown };
      };
    }).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  return internals?.ReactCurrentDispatcher;
}

export function runReactHealthcheck(): HealthReport {
  const version = React.version;
  const g = globalThis as unknown as Record<string, Marker | undefined>;
  const prev = g[GLOBAL_KEY];
  if (prev) {
    prev.instances += 1;
    if (prev.version !== version || prev.instances > 1) {
      const msg = `Detected ${prev.instances} React copies (versions ${prev.version} vs ${version}).`;
      return { ok: false, reason: "duplicate-react", detail: msg, reactVersion: version };
    }
  } else {
    g[GLOBAL_KEY] = { version, instances: 1 };
  }

  const dispatcher = readDispatcher();
  if (dispatcher === null || dispatcher === undefined) {
    return {
      ok: false,
      reason: "null-dispatcher",
      detail: "React hooks dispatcher is null — usually indicates a stale Vite dep cache.",
      reactVersion: version,
    };
  }

  return { ok: true, reactVersion: version };
}

/**
 * Best-effort client-side recovery for a stale Vite dep cache.
 * The dev server owns `node_modules/.vite`, so we can't delete it from the
 * browser — but we can force a hard reload with a bust param, unregister the
 * service worker, and clear CacheStorage. Vite will then re-optimize deps on
 * the next request. We rate-limit to avoid infinite reload loops.
 */
export async function attemptViteCacheReset(): Promise<void> {
  if (typeof window === "undefined") return;

  // Rate-limit: don't loop more than once per 30s.
  const last = Number(sessionStorage.getItem(RESET_STORAGE_KEY) || 0);
  if (Date.now() - last < 30_000) {
    console.warn("[healthcheck] Skipping auto-reset — recent attempt detected.");
    return;
  }
  sessionStorage.setItem(RESET_STORAGE_KEY, String(Date.now()));

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  url.searchParams.set(RESET_FLAG, String(Date.now()));
  window.location.replace(url.toString());
}
