/**
 * Deterministic, per-visitor telemetry sampling.
 *
 * Only pure telemetry (Core Web Vitals / RUM) is sampled — never user data,
 * sessions, auth events or page views tied to a signed-in account.
 *
 * Sampling is deterministic on the visitor id so a sampled-in visitor reports
 * *all* of their metrics (LCP/INP/CLS/FCP/TTFB stay comparable) instead of a
 * random subset, which keeps distributions unbiased while cutting row volume.
 */

/** FNV-1a → stable 0..1 bucket for a string. */
function hashToUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Fraction of visitors whose RUM metrics are stored (0..1). */
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
