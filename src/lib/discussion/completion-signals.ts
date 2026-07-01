/**
 * Heuristic completion signals fused with the AI verdict from the
 * `completion-detector` edge function.
 *
 * A discussion is "naturally complete" when several deterministic signals align:
 *   - Repeated content (novelty << baseline)
 *   - Explicit summary/conclusion markers in recent utterances
 *   - Extended low-energy silence
 *   - AI verdict of consensus / topic exhaustion with confidence >= 0.75
 */

export interface RecentUtterance {
  text: string;
  duration_ms: number;
  novelty: number; // 0 – 1, from scoring-guards
  ts: number;      // epoch ms
}

export interface CompletionInputs {
  utterances: RecentUtterance[]; // last N (~ 12)
  silence_seconds: number;
  ai_verdict?: { confidence: number; reason: string } | null;
}

export interface CompletionVerdict {
  isComplete: boolean;
  confidence: number;
  reason: string;
  evidence: Record<string, unknown>;
}

const CONCLUSION_MARKERS = [
  /\bin conclusion\b/i,
  /\bto summari[sz]e\b/i,
  /\bfinal thoughts?\b/i,
  /\bwrap(?:ping)? up\b/i,
  /\bwe (?:all )?agree\b/i,
  /\bno (?:further|more) points?\b/i,
];

export function evaluateCompletion(inp: CompletionInputs): CompletionVerdict {
  const evidence: Record<string, unknown> = {};
  let score = 0;

  // Novelty decay
  const recent = inp.utterances.slice(-6);
  const avgNovelty =
    recent.length > 0 ? recent.reduce((s, u) => s + u.novelty, 0) / recent.length : 1;
  evidence.avg_novelty = Number(avgNovelty.toFixed(2));
  if (avgNovelty < 0.35) score += 0.35;
  else if (avgNovelty < 0.5) score += 0.15;

  // Explicit conclusion markers in the last 3 utterances
  const markers = recent
    .slice(-3)
    .filter((u) => CONCLUSION_MARKERS.some((r) => r.test(u.text))).length;
  evidence.conclusion_markers = markers;
  if (markers >= 1) score += 0.2;
  if (markers >= 2) score += 0.15;

  // Sustained silence
  evidence.silence_seconds = inp.silence_seconds;
  if (inp.silence_seconds >= 30) score += 0.15;

  // AI verdict
  if (inp.ai_verdict && inp.ai_verdict.confidence >= 0.6) {
    evidence.ai_confidence = inp.ai_verdict.confidence;
    evidence.ai_reason = inp.ai_verdict.reason;
    score += Math.min(0.4, inp.ai_verdict.confidence * 0.4);
  }

  const confidence = Math.min(1, Number(score.toFixed(2)));
  return {
    isComplete: confidence >= 0.75,
    confidence,
    reason:
      confidence >= 0.75
        ? 'natural_completion'
        : confidence >= 0.5
          ? 'nearing_completion'
          : 'ongoing',
    evidence,
  };
}
