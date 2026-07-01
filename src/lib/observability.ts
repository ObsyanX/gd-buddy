// Track 1 — Observability helper. Wraps async work with latency measurement
// and writes to `perf_events` (fire-and-forget; never blocks the caller).
import { supabase } from "@/integrations/supabase/client";

export interface MeasureOpts {
  session_id?: string | null;
  metadata?: Record<string, unknown>;
}

export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  opts: MeasureOpts = {},
): Promise<T> {
  const start = performance.now();
  let ok = true;
  try {
    return await fn();
  } catch (e) {
    ok = false;
    throw e;
  } finally {
    const duration_ms = Math.round(performance.now() - start);
    // fire-and-forget; swallow errors so telemetry never breaks callers
    void supabase
      .from("perf_events")
      .insert([
        {
          name,
          duration_ms,
          ok,
          session_id: opts.session_id ?? undefined,
          metadata: (opts.metadata ?? {}) as never,
        },
      ])
      .then(() => {}, () => {});
  }
}
