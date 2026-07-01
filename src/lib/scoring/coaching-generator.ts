/**
 * Deterministic coaching-tip generator.
 *
 * Runs first — cheap, explainable, and always produces at least one tip per
 * weak axis. The `coaching-engine` edge function then optionally enriches
 * these with AI-generated language variations.
 */

import type { RadarScore } from './radar-score';

export interface CoachingTip {
  category: string;
  priority: 1 | 2 | 3; // 1 = highest
  headline: string;
  body: string;
  evidence: Record<string, unknown>;
}

const AXES: Array<keyof RadarScore> = [
  'clarity',
  'reasoning',
  'collaboration',
  'evidence',
  'emotional_intelligence',
  'leadership',
];

const AXIS_COPY: Record<string, { headline: string; body: string }> = {
  clarity: {
    headline: 'Tighten your delivery',
    body:
      'Your turns were either very short or padded with filler. Aim for 15–25 words per turn — one clear claim + one reason.',
  },
  reasoning: {
    headline: 'Bring a fresh angle',
    body:
      'You repeated ideas that were already on the table. Before you speak, ask "what have others missed?" and open with that.',
  },
  collaboration: {
    headline: 'Share the floor',
    body:
      'Your speaking time drifted far from the fair share. Invite a quieter participant in with "What do you think, [name]?" every 2–3 turns.',
  },
  evidence: {
    headline: 'Back claims with evidence',
    body:
      'Several claims were unverifiable or disputed. Cite a number, source, or example every time you make an absolute statement.',
  },
  emotional_intelligence: {
    headline: 'Regulate tone under pressure',
    body:
      'Your affect leaned negative during the discussion. Pause, name the concern, then respond — that swings sentiment back.',
  },
  leadership: {
    headline: 'Take initiative earlier',
    body:
      'You rarely opened new threads. Try starting the next session with the framing move ("Here are the three angles we should cover…").',
  },
};

export function generateTips(score: RadarScore): CoachingTip[] {
  const weak = AXES
    .map((axis) => ({ axis, value: score[axis] as number }))
    .filter((x) => x.value < 60)
    .sort((a, b) => a.value - b.value);

  if (!weak.length) {
    return [
      {
        category: 'reinforce',
        priority: 3,
        headline: 'Keep doing what you did',
        body:
          "You scored ≥ 60 on every axis. Next session, push for depth on your weakest area to break past 80.",
        evidence: { overall: score.overall },
      },
    ];
  }

  return weak.slice(0, 3).map((w, idx) => {
    const copy = AXIS_COPY[w.axis];
    return {
      category: w.axis,
      priority: (idx === 0 ? 1 : idx === 1 ? 2 : 3) as 1 | 2 | 3,
      headline: copy.headline,
      body: copy.body,
      evidence: { axis: w.axis, score: w.value },
    };
  });
}
