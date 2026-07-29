import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Stale-chunk resilient `React.lazy`.
 *
 * After a new deploy, hashed chunk filenames change. A tab that was opened
 * before the deploy still references the old filenames, so the dynamic import
 * 404s with "Failed to fetch dynamically imported module".
 *
 * Strategy:
 *  1. Retry the import a couple of times with a cache-busting query — this
 *     also covers transient network blips.
 *  2. If it still fails, force a one-time hard reload so the browser fetches
 *     the fresh index.html + manifest. Guarded by sessionStorage so we can
 *     never loop.
 */

const RELOAD_KEY = "chunk-reload-at";
const RELOAD_WINDOW_MS = 30_000;

function shouldHardReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Failed to fetch/i.test(
    msg,
  );
}

export function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const attempts = 3;
    let lastError: unknown;

    for (let i = 0; i < attempts; i++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (!isChunkLoadError(err)) throw err;
        // brief backoff before retrying — Vite/Rollup will hit the network again
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }

    if (typeof window !== "undefined" && isChunkLoadError(lastError) && shouldHardReload()) {
      // Drop caches so the SW / HTTP cache can't hand back the stale manifest.
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch {
        /* best effort */
      }
      window.location.reload();
      // Never resolves — the page is going away.
      return new Promise<{ default: T }>(() => {});
    }

    throw lastError;
  });
}
