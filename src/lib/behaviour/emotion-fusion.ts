// Track 3 — Emotion fusion (text + prosody) with PII masking.

import { maskPII } from "@/lib/pii";

export interface EmotionSignal {
  source: "text" | "prosody";
  label: string;
  valence: number;
  arousal: number;
  confidence: number;
  rationale?: string;
}

export interface FusedEmotion {
  label: string;
  valence: number;
  arousal: number;
  confidence: number;
  evidence: Record<string, unknown>;
}

/** Weighted fusion: text is authoritative when its confidence dominates,
 * prosody dominates on strong arousal signals. */
export function fuseEmotion(text: EmotionSignal | null, prosody: EmotionSignal | null): FusedEmotion {
  if (!text && !prosody) {
    return { label: "neutral", valence: 0, arousal: 0, confidence: 0, evidence: {} };
  }
  if (text && !prosody) return toFused(text);
  if (!text && prosody) return toFused(prosody);

  const t = text!;
  const p = prosody!;
  // Prosody arousal weighted more when high; text valence trusted when confident.
  const arousalWeight = p.arousal > 0.7 ? 0.7 : 0.4;
  const arousal = p.arousal * arousalWeight + t.arousal * (1 - arousalWeight);
  const valenceWeight = t.confidence > 0.6 ? 0.75 : 0.5;
  const valence = t.valence * valenceWeight + p.valence * (1 - valenceWeight);
  const confidence = Math.min(1, 0.5 * t.confidence + 0.5 * p.confidence + 0.1);

  const label = pickLabel(valence, arousal, t.label, p.label);

  return {
    label,
    valence: clamp(valence, -1, 1),
    arousal: clamp(arousal, 0, 1),
    confidence,
    evidence: {
      text: {
        label: t.label,
        valence: t.valence,
        arousal: t.arousal,
        confidence: t.confidence,
        rationale: maskPII(t.rationale ?? ""),
      },
      prosody: {
        label: p.label,
        valence: p.valence,
        arousal: p.arousal,
        confidence: p.confidence,
      },
    },
  };
}

function toFused(sig: EmotionSignal): FusedEmotion {
  return {
    label: sig.label,
    valence: clamp(sig.valence, -1, 1),
    arousal: clamp(sig.arousal, 0, 1),
    confidence: clamp(sig.confidence, 0, 1),
    evidence: { [sig.source]: { ...sig, rationale: maskPII(sig.rationale ?? "") } },
  };
}

function pickLabel(valence: number, arousal: number, tLabel: string, pLabel: string): string {
  if (arousal > 0.7 && valence < -0.3) return "angry";
  if (arousal > 0.65 && valence > 0.2) return "excited";
  if (arousal < 0.3 && Math.abs(valence) < 0.2) return "calm";
  if (valence > 0.35) return "positive";
  if (valence < -0.35) return "negative";
  // Fall back to whichever signal has a specific label.
  return tLabel || pLabel || "neutral";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
