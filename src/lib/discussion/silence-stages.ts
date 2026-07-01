/**
 * Multi-stage silence handling.
 *
 * Stage 1 (nudge)     : 12s – 24s of silence → gentle room prompt.
 * Stage 2 (escalate)  : 25s – 45s          → address the quietest participant.
 * Stage 3 (summarize) : > 45s              → moderator summary + phase advance hint.
 *
 * Pure functions only — the caller (edge function / client) is responsible for I/O.
 */

export type SilenceStage = 1 | 2 | 3 | null;

export interface ParticipantActivity {
  user_id: string;
  last_spoke_at: number | null; // epoch ms; null = never spoke
  total_seconds: number;
}

export interface StageDecision {
  stage: SilenceStage;
  silence_seconds: number;
  target_user_id: string | null;
  reason: string;
}

export interface SilenceThresholds {
  stage1Min: number;
  stage2Min: number;
  stage3Min: number;
  /** Debounce: minimum seconds between two stage-N events. */
  cooldownSeconds: number;
}

export const DEFAULT_THRESHOLDS: SilenceThresholds = {
  stage1Min: 12,
  stage2Min: 25,
  stage3Min: 46,
  cooldownSeconds: 15,
};

/** Compute the current silence-stage decision based on last-utterance time. */
export function evaluateSilenceStage(
  lastUtteranceAtMs: number | null,
  now: number,
  participants: ParticipantActivity[],
  thresholds: SilenceThresholds = DEFAULT_THRESHOLDS,
): StageDecision {
  const silenceSec =
    lastUtteranceAtMs == null
      ? Math.floor(now / 1000) - Math.floor(now / 1000) // will be replaced below
      : Math.max(0, Math.floor((now - lastUtteranceAtMs) / 1000));

  // If nobody has ever spoken, treat "now - session-start" as silence via now-based fallback:
  const effectiveSilence =
    lastUtteranceAtMs == null ? Math.max(silenceSec, thresholds.stage1Min) : silenceSec;

  let stage: SilenceStage = null;
  if (effectiveSilence >= thresholds.stage3Min) stage = 3;
  else if (effectiveSilence >= thresholds.stage2Min) stage = 2;
  else if (effectiveSilence >= thresholds.stage1Min) stage = 1;

  let target: string | null = null;
  if (stage === 2 || stage === 3) target = pickQuietest(participants);

  return {
    stage,
    silence_seconds: effectiveSilence,
    target_user_id: target,
    reason:
      stage === null
        ? 'ok'
        : stage === 1
          ? 'gentle_nudge'
          : stage === 2
            ? 'address_quietest'
            : 'summarize_and_advance',
  };
}

/** Should a new stage-event be emitted given the last emission? */
export function shouldEmitStage(
  decision: StageDecision,
  lastEmittedStage: SilenceStage,
  lastEmittedAtMs: number | null,
  now: number,
  thresholds: SilenceThresholds = DEFAULT_THRESHOLDS,
): boolean {
  if (decision.stage === null) return false;
  if (decision.stage !== lastEmittedStage) return true;
  if (lastEmittedAtMs == null) return true;
  return now - lastEmittedAtMs >= thresholds.cooldownSeconds * 1000;
}

function pickQuietest(participants: ParticipantActivity[]): string | null {
  if (!participants.length) return null;
  const sorted = [...participants].sort((a, b) => a.total_seconds - b.total_seconds);
  return sorted[0]?.user_id ?? null;
}
