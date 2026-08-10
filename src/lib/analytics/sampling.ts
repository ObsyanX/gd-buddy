/**
 * Deterministic, per-visitor telemetry sampling.
 *
 * Only pure telemetry (Core Web Vitals / RUM) is sampled — never user data,
 * sessions, auth events or page views tied to a signed-in account.
 *
 * Sampling is deterministic on the visitor id so a sampled-in visitor reports
 * *all* of their metrics (LCP/INP/CLS/FCP/TTFB stay comparable) instead of a
 * random subset, which keeps distributions unbiased while cutting row volume.
 *
 * Runtime control (no redeploy needed) comes from admin_settings feature flags:
 *   telemetry.rum_sampling_enabled  boolean  — false ⇒ record 100% (rollback)
 *   telemetry.rum_sample_rate       number   — 0..1 fraction of visitors kept
 *   telemetry.rum_calibration_until string   — ISO timestamp; while in the
 *       future every event is recorded but tagged with the in_sample flag it
 *       *would* have had, so sampled vs unsampled p75 can be compared.
 */

import { supabase } from "@/integrations/supabase/client";

/** FNV-1a → stable 0..1 bucket for a string. */
function hashToUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Build-time default fraction of visitors whose RUM metrics are stored (0..1). */
export const RUM_SAMPLE_RATE = (() => {
  const raw = Number(import.meta.env.VITE_RUM_SAMPLE_RATE);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  return import.meta.env.PROD ? 0.25 : 1;
})();

/** True when this visitor is in the RUM sample. */
export function isRumSampled(visitorId: string, rate = RUM_SAMPLE_RATE): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return hashToUnit(`rum:${visitorId}`) < rate;
}

/** Weight to multiply sampled counts by when extrapolating totals. */
export function rumSampleWeight(rate = RUM_SAMPLE_RATE): number {
  return rate > 0 ? 1 / rate : 1;
}

export type RumSamplingConfig = {
  /** Sampling active at all (false ⇒ full capture, i.e. rolled back). */
  enabled: boolean;
  /** Effective fraction of visitors sampled in. */
  rate: number;
  /** Controlled test window: record everything, tag in_sample. */
  calibrating: boolean;
};

async function flag<T>(key: string): Promise<T | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("get_feature_flag", { _key: key });
    return (data ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Resolve runtime sampling config; falls back to build-time defaults. */
export async function loadRumSamplingConfig(): Promise<RumSamplingConfig> {
  const [enabled, rate, until] = await Promise.all([
    flag<boolean>("telemetry.rum_sampling_enabled"),
    flag<number>("telemetry.rum_sample_rate"),
    flag<string>("telemetry.rum_calibration_until"),
  ]);

  const parsedRate =
    typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : RUM_SAMPLE_RATE;
  const calibrating = typeof until === "string" && Number.isFinite(Date.parse(until)) && Date.parse(until) > Date.now();

  return {
    enabled: enabled === null ? true : !!enabled,
    rate: enabled === false ? 1 : parsedRate,
    calibrating,
  };
}
