import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { errorMonitor } from "@/lib/error-monitor";

/**
 * Stale-chunk resilient `React.lazy`.
 *
 * After a new deploy, hashed chunk filenames change. A tab that was opened
 * before the deploy still references the old filenames, so the dynamic import
 * 404s with "Failed to fetch dynamically imported module".
 *
 * Strategy:
 *  1. Retry the import a couple of times — this also covers transient blips.
 *  2. If it still fails, force a one-time hard reload so the browser fetches
 *     the fresh index.html + manifest. Guarded by sessionStorage so we can
 *     never loop.
 *
 * Every attempt, failure and recovery action is recorded (console + error
 * monitor) with the chunk name, resolved URL, retry count and outcome.
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

/** Best-effort extraction of the failing module URL from the error message. */
function extractUrl(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/https?:\/\/[^\s)"']+/);
  return m?.[0];
}

function report(
  chunk: string,
  action: "retry" | "reload" | "gave_up" | "recovered",
  details: Record<string, unknown>,
) {
  const line = `[lazyRetry] ${chunk} → ${action}`;
  if (action === "recovered") console.info(line, details);
  else console.warn(line, details);

  if (action === "retry") return; // keep noise out of the incident feed
  try {
    errorMonitor.capture({
      error_message: `Dynamic import ${action} for "${chunk}": ${String(details.message ?? "")}`.slice(0, 500),
      error_stack: typeof details.stack === "string" ? details.stack : undefined,
      error_source: "client",
      page_url: typeof window !== "undefined" ? window.location.href : undefined,
      metadata: { lazy_retry: true, chunk, action, ...details },
    });
  } catch {
    /* reporting must never break loading */
  }
}

export function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  chunkName = "unknown-chunk",
): LazyExoticComponent<T> {
  return lazy(async () => {
    const attempts = 3;
    let lastError: unknown;
    const startedAt = Date.now();

    for (let i = 0; i < attempts; i++) {
      try {
        const mod = await factory();
        if (i > 0) {
          report(chunkName, "recovered", {
            retry_count: i,
            duration_ms: Date.now() - startedAt,
          });
        }
        return mod;
      } catch (err) {
        lastError = err;
        if (!isChunkLoadError(err)) throw err;
        report(chunkName, "retry", {
          retry_count: i + 1,
          url: extractUrl(err),
          message: err instanceof Error ? err.message : String(err),
        });
        // brief backoff before retrying — Vite/Rollup will hit the network again
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
      }
    }

    const base = {
      retry_count: attempts,
      url: extractUrl(lastError),
      message: lastError instanceof Error ? lastError.message : String(lastError),
      stack: lastError instanceof Error ? lastError.stack : undefined,
      duration_ms: Date.now() - startedAt,
      online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
    };

    if (typeof window !== "undefined" && isChunkLoadError(lastError) && shouldHardReload()) {
      report(chunkName, "reload", { ...base, recovery: "hard_reload_with_cache_purge" });
      // Flush pending telemetry before the page goes away.
      try {
        await errorMonitor.flush();
      } catch {
        /* ignore */
      }
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

    report(chunkName, "gave_up", { ...base, recovery: "surfaced_to_route_boundary" });
    throw lastError;
  });
}
