import { describe, it, expect } from 'vitest';
import {
  evaluateSilenceStage,
  shouldEmitStage,
  DEFAULT_THRESHOLDS,
} from '@/lib/discussion/silence-stages';
import { computeAllowances } from '@/lib/discussion/adaptive-allowance';
import { evaluateCompletion } from '@/lib/discussion/completion-signals';

const now = 1_000_000_000_000;

describe('silence-stages', () => {
  const parts = [
    { user_id: 'a', last_spoke_at: now - 5_000, total_seconds: 90 },
    { user_id: 'b', last_spoke_at: now - 30_000, total_seconds: 20 },
    { user_id: 'c', last_spoke_at: now - 60_000, total_seconds: 10 },
  ];

  it('returns null stage under threshold', () => {
    const d = evaluateSilenceStage(now - 5_000, now, parts);
    expect(d.stage).toBeNull();
  });

  it('stage 1 for 12-24s silence', () => {
    const d = evaluateSilenceStage(now - 15_000, now, parts);
    expect(d.stage).toBe(1);
    expect(d.target_user_id).toBeNull();
  });

  it('stage 2 targets quietest', () => {
    const d = evaluateSilenceStage(now - 30_000, now, parts);
    expect(d.stage).toBe(2);
    expect(d.target_user_id).toBe('c');
  });

  it('stage 3 for prolonged silence', () => {
    const d = evaluateSilenceStage(now - 60_000, now, parts);
    expect(d.stage).toBe(3);
  });

  it('shouldEmitStage respects cooldown', () => {
    const decision = evaluateSilenceStage(now - 15_000, now, parts);
    expect(shouldEmitStage(decision, 1, now - 5_000, now)).toBe(false);
    expect(shouldEmitStage(decision, 1, now - 20_000, now)).toBe(true);
    expect(shouldEmitStage(decision, null, null, now)).toBe(true);
  });
});

describe('adaptive-allowance', () => {
  it('penalizes dominance and rewards quiet speakers', () => {
    const results = computeAllowances(
      [
        { user_id: 'dom', used_seconds: 300, weight: 1 },
        { user_id: 'mid', used_seconds: 100, weight: 1 },
        { user_id: 'quiet', used_seconds: 10, weight: 1 },
      ],
      { totalBudgetSeconds: 600 },
    );
    const dom = results.find((r) => r.user_id === 'dom')!;
    const quiet = results.find((r) => r.user_id === 'quiet')!;
    expect(dom.reason).toBe('dominance_correction');
    expect(quiet.reason).toBe('encourage_quiet_speaker');
    expect(quiet.recommended_seconds).toBeGreaterThan(dom.recommended_seconds);
  });

  it('respects min/max clamps', () => {
    const r = computeAllowances(
      [
        { user_id: 'a', used_seconds: 0, weight: 5 },
        { user_id: 'b', used_seconds: 0, weight: 0.1 },
      ],
      { totalBudgetSeconds: 600, minSeconds: 40, maxSeconds: 150 },
    );
    expect(r.every((x) => x.recommended_seconds >= 40 && x.recommended_seconds <= 150)).toBe(true);
  });
});

describe('completion-signals', () => {
  it('flags completion when signals align', () => {
    const v = evaluateCompletion({
      utterances: [
        { text: 'point A', novelty: 0.9, duration_ms: 5000, ts: 1 },
        { text: 'restated A', novelty: 0.2, duration_ms: 4000, ts: 2 },
        { text: 'To summarize, we all agree on this.', novelty: 0.3, duration_ms: 5000, ts: 3 },
      ],
      silence_seconds: 32,
      ai_verdict: { confidence: 0.85, reason: 'consensus' },
    });
    expect(v.isComplete).toBe(true);
    expect(v.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('reports ongoing when discussion is lively', () => {
    const v = evaluateCompletion({
      utterances: Array.from({ length: 6 }, (_, i) => ({
        text: `fresh angle ${i}`,
        novelty: 0.8,
        duration_ms: 5000,
        ts: i,
      })),
      silence_seconds: 3,
      ai_verdict: null,
    });
    expect(v.isComplete).toBe(false);
    expect(v.reason).toBe('ongoing');
  });
});
