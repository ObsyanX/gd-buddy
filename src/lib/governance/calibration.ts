/**
 * Track 9.3 — Confidence Calibration.
 *
 * Raw model confidence rarely equals real accuracy. We keep rolling
 * (action, confidence-bin) accuracy stats in `calibration_bins` and use them
 * to translate raw confidence into a calibrated probability. If the calibrated
 * probability falls below the auto-action threshold, callers should downgrade
 * the AI decision from "auto" to "recommendation".
 */
import { supabase } from "@/integrations/supabase/client";

export interface CalibrationBin {
  action: string;
  bin_lo: number;
  bin_hi: number;
  samples: number;
  correct: number;
  empirical_accuracy: number;
}

const cache = new Map<string, { bins: CalibrationBin[]; expires: number }>();
const TTL_MS = 60_000;

export const AUTO_ACTION_THRESHOLD = 0.75;

async function loadBins(action: string): Promise<CalibrationBin[]> {
  const now = Date.now();
  const cached = cache.get(action);
  if (cached && cached.expires > now) return cached.bins;

  const { data, error } = await supabase
    .from("calibration_bins")
    .select("action, bin_lo, bin_hi, samples, correct, empirical_accuracy")
    .eq("action", action)
    .order("bin_lo", { ascending: true });

  if (error || !data) return [];
  const bins = data as CalibrationBin[];
  cache.set(action, { bins, expires: now + TTL_MS });
  return bins;
}

/**
 * Map a raw confidence in [0,1] to a calibrated probability using the
 * empirical accuracy of the surrounding bin. Falls back to identity when we
 * lack samples.
 */
export async function calibrate(action: string, raw: number): Promise<number> {
  const bins = await loadBins(action);
  const clamped = Math.min(1, Math.max(0, raw));
  const bin = bins.find((b) => clamped >= Number(b.bin_lo) && clamped <= Number(b.bin_hi));
  if (!bin || bin.samples < 20) return clamped;
  return Number(bin.empirical_accuracy);
}

export function shouldAutoAct(calibrated: number, threshold = AUTO_ACTION_THRESHOLD): boolean {
  return calibrated >= threshold;
}
