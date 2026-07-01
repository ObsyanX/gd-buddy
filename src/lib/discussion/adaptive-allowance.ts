/**
 * Adaptive speaking-time allowance.
 *
 * Rebalances the per-participant recommended speaking budget every tick based on
 *   - how much they have already spoken (used_seconds),
 *   - participant weight (host/panelist/observer → 1.0 / 1.0 / 0.5),
 *   - dominance signal from the behaviour aggregator (Gini component).
 *
 * Pure math — the caller persists results to `adaptive_speaking_allowances`.
 */

export interface AllowanceInput {
  user_id: string;
  used_seconds: number;
  weight: number; // 0.5 – 1.5
}

export interface AllowanceResult {
  user_id: string;
  recommended_seconds: number;
  weight: number;
  reason: string;
}

export interface AllowanceOptions {
  /** Total session budget in seconds (defaults to 600s = 10min). */
  totalBudgetSeconds?: number;
  /** Floor per participant so nobody is starved. */
  minSeconds?: number;
  /** Ceiling per participant to prevent dominance. */
  maxSeconds?: number;
}

export function computeAllowances(
  inputs: AllowanceInput[],
  opts: AllowanceOptions = {},
): AllowanceResult[] {
  const total = opts.totalBudgetSeconds ?? 600;
  const min = opts.minSeconds ?? 30;
  const max = opts.maxSeconds ?? 180;

  if (!inputs.length) return [];

  // Base share proportional to weight
  const weightSum = inputs.reduce((s, p) => s + Math.max(0.1, p.weight), 0);
  const rawShares = inputs.map((p) => ({
    p,
    base: (Math.max(0.1, p.weight) / weightSum) * total,
  }));

  // Deduct what they've already used, so remaining budget rebalances toward quiet folks
  const adjusted = rawShares.map(({ p, base }) => {
    const remaining = base - p.used_seconds;
    // Push quiet users up, dominant users down. 50% smoothing so the correction is visible.
    const smoothed = base + remaining * 0.5;
    const clamped = Math.min(max, Math.max(min, Math.round(smoothed)));
    const reason =
      p.used_seconds > base * 1.25
        ? 'dominance_correction'
        : p.used_seconds < base * 0.5
          ? 'encourage_quiet_speaker'
          : 'balanced';
    return {
      user_id: p.user_id,
      recommended_seconds: clamped,
      weight: p.weight,
      reason,
    };
  });

  return adjusted;
}
