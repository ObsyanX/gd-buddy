// Track 3 — Pure behaviour math. Server + client safe (no browser APIs).

export interface ParticipantTurnStats {
  participantId: string;
  talkTimeMs: number;
  turnCount: number;
  interruptionCount: number;
  lastSpokeAt?: number | null;
}

export function gini(values: number[]): number {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0);
  if (v.length === 0) return 0;
  const sum = v.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const sorted = [...v].sort((a, b) => a - b);
  const n = sorted.length;
  let cumulative = 0;
  for (let i = 0; i < n; i++) cumulative += (i + 1) * sorted[i];
  return (2 * cumulative) / (n * sum) - (n + 1) / n;
}

export function dominanceScore(participantMs: number, totalMs: number, participants: number): number {
  if (totalMs <= 0 || participants <= 0) return 0;
  const share = participantMs / totalMs;
  const fair = 1 / participants;
  // 0 when at fair share, 1 when hogging everything.
  const excess = Math.max(0, share - fair) / Math.max(1e-6, 1 - fair);
  return clamp01(excess);
}

export function engagementScore(params: {
  turnCount: number;
  talkTimeMs: number;
  sessionAgeMs: number;
  interruptionCount: number;
}): number {
  const { turnCount, talkTimeMs, sessionAgeMs, interruptionCount } = params;
  if (sessionAgeMs <= 0) return 0;
  const rate = turnCount / (sessionAgeMs / 60_000); // turns per minute
  const rateScore = clamp01(rate / 3); // 3 tpm → 1.0
  const talkScore = clamp01(talkTimeMs / Math.max(1, sessionAgeMs * 0.25));
  const disruptPenalty = clamp01(interruptionCount / 10);
  return clamp01(0.6 * rateScore + 0.4 * talkScore - 0.3 * disruptPenalty);
}

export function interruptionRate(totalInterruptions: number, sessionAgeMs: number): number {
  if (sessionAgeMs <= 0) return 0;
  return totalInterruptions / (sessionAgeMs / 60_000);
}

export function overallHealth(input: {
  participationGini: number;
  interruptionRate: number;
  sentimentIndex: number;
  topicFocus: number;
  energy: number;
}): number {
  const fair = 1 - clamp01(input.participationGini);
  const civil = 1 - clamp01(input.interruptionRate / 6); // 6 int/min = 0
  const mood = (clamp(input.sentimentIndex, -1, 1) + 1) / 2;
  const focus = clamp01(input.topicFocus);
  const energy = clamp01(input.energy);
  const score = 0.28 * fair + 0.22 * civil + 0.18 * mood + 0.2 * focus + 0.12 * energy;
  return Math.round(clamp01(score) * 100);
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
