// Track 8: Load & latency monitoring. Reads `perf_events` and computes
// rolling p50 / p95 / error-rate per operation name over a time window.
import { supabase } from "@/integrations/supabase/client";

export interface LatencyBucket {
  name: string;
  count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function bucketize(
  rows: Array<{ name: string; duration_ms: number; ok: boolean }>,
): LatencyBucket[] {
  const byName = new Map<string, { durs: number[]; errs: number }>();
  for (const r of rows) {
    let b = byName.get(r.name);
    if (!b) {
      b = { durs: [], errs: 0 };
      byName.set(r.name, b);
    }
    b.durs.push(r.duration_ms);
    if (!r.ok) b.errs++;
  }
  const out: LatencyBucket[] = [];
  for (const [name, { durs, errs }] of byName) {
    const sorted = [...durs].sort((a, b) => a - b);
    out.push({
      name,
      count: durs.length,
      p50_ms: percentile(sorted, 50),
      p95_ms: percentile(sorted, 95),
      p99_ms: percentile(sorted, 99),
      error_rate: durs.length ? errs / durs.length : 0,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export async function fetchLatencySnapshot(windowMinutes = 60): Promise<LatencyBucket[]> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("perf_events")
    .select("name, duration_ms, ok")
    .gte("created_at", since)
    .limit(5000);
  if (error) throw error;
  return bucketize((data ?? []) as Array<{ name: string; duration_ms: number; ok: boolean }>);
}
