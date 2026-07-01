/**
 * Radar-score aggregator.
 *
 * Turns raw per-participant signals from earlier tracks into a 6-axis
 * radar score in the range [0, 100]:
 *   clarity, reasoning, collaboration, evidence, emotional_intelligence, leadership.
 *
 * All inputs are optional; missing signals do not crash — the axis falls back
 * to a neutral baseline (50) so the radar is always renderable.
 */

export interface ScoreInputs {
  // Speaking behaviour (Track 3)
  speaking_seconds?: number;
  fair_share_seconds?: number;
  interruptions_given?: number;
  interruptions_received?: number;

  // Language / structure (Track 4/5)
  avg_words_per_turn?: number;
  novelty_avg?: number;         // 0..1
  duplicate_flags?: number;

  // Reasoning quality (Track 5)
  fallacy_count?: number;
  fact_supported?: number;
  fact_disputed?: number;
  fact_unverifiable?: number;

  // Emotion (Track 3)
  positive_ratio?: number;      // 0..1
  negative_ratio?: number;      // 0..1
  regulated_ratio?: number;     // 0..1 (calm/regulated affect share)

  // Leadership signal
  turns_initiated?: number;
  invitations_offered?: number; // "what do you think, X?"
}

export interface RadarScore {
  clarity: number;
  reasoning: number;
  collaboration: number;
  evidence: number;
  emotional_intelligence: number;
  leadership: number;
  overall: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const scale = (v: number, min: number, max: number) => {
  if (max === min) return 50;
  return clamp(((v - min) / (max - min)) * 100);
};

export function computeRadarScore(i: ScoreInputs): RadarScore {
  const wordsPerTurn = i.avg_words_per_turn ?? 15;
  const novelty = i.novelty_avg ?? 0.5;
  const duplicates = i.duplicate_flags ?? 0;
  const fallacies = i.fallacy_count ?? 0;
  const supported = i.fact_supported ?? 0;
  const disputed = i.fact_disputed ?? 0;
  const unverifiable = i.fact_unverifiable ?? 0;
  const totalClaims = supported + disputed + unverifiable;
  const pos = i.positive_ratio ?? 0.5;
  const neg = i.negative_ratio ?? 0.2;
  const regulated = i.regulated_ratio ?? 0.6;
  const speaking = i.speaking_seconds ?? 0;
  const fairShare = i.fair_share_seconds ?? Math.max(60, speaking);
  const intGiven = i.interruptions_given ?? 0;
  const intRecv = i.interruptions_received ?? 0;
  const initiated = i.turns_initiated ?? 0;
  const invited = i.invitations_offered ?? 0;

  // Clarity: healthy word count, low duplicates
  const clarity = clamp(
    scale(wordsPerTurn, 4, 45) * 0.7 + (1 - Math.min(1, duplicates / 4)) * 30,
  );

  // Reasoning: novelty ↑, fallacies ↓
  const reasoning = clamp(novelty * 70 + (1 - Math.min(1, fallacies / 5)) * 30);

  // Collaboration: proximity to fair share, few interruptions given
  const shareRatio = fairShare > 0 ? Math.min(1.5, speaking / fairShare) : 1;
  const shareScore = 100 - Math.min(100, Math.abs(1 - shareRatio) * 120);
  const collaboration = clamp(shareScore * 0.7 + (1 - Math.min(1, intGiven / 5)) * 30);

  // Evidence: supported ratio when there are claims; neutral otherwise
  const evidence =
    totalClaims === 0
      ? 55
      : clamp(
          (supported / totalClaims) * 80 +
            (1 - disputed / totalClaims) * 20,
        );

  // Emotional intelligence: positivity, regulated affect, tolerating interruptions
  const emotional_intelligence = clamp(
    pos * 40 + regulated * 40 + (1 - Math.min(1, neg)) * 20 - Math.min(20, intGiven * 3),
  );

  // Leadership: initiating turns + inviting others in
  const leadership = clamp(
    scale(initiated, 0, 6) * 0.5 + scale(invited, 0, 4) * 0.4 + (intRecv > 0 ? 10 : 0),
  );

  const overall = Number(
    (
      (clarity + reasoning + collaboration + evidence + emotional_intelligence + leadership) /
      6
    ).toFixed(1),
  );

  return {
    clarity: Number(clarity.toFixed(1)),
    reasoning: Number(reasoning.toFixed(1)),
    collaboration: Number(collaboration.toFixed(1)),
    evidence: Number(evidence.toFixed(1)),
    emotional_intelligence: Number(emotional_intelligence.toFixed(1)),
    leadership: Number(leadership.toFixed(1)),
    overall,
  };
}
