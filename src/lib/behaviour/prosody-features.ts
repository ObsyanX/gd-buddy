// Track 3 — Prosody features extracted client-side from PCM/analyser frames.
// Pure functions; no browser APIs, so unit-testable.

export interface ProsodyFrame {
  /** Time-domain samples in [-1, 1] */
  samples: Float32Array;
  sampleRate: number;
}

export interface ProsodyFeatures {
  pitchHz: number;         // 0 if unvoiced
  pitchVarHz: number;      // variance across frames (only valid on rollup)
  energyRms: number;       // 0..1
  zeroCrossingRate: number; // 0..1 (correlates with speaking rate)
  voiced: boolean;
}

export function extractProsody(frame: ProsodyFrame): ProsodyFeatures {
  const s = frame.samples;
  if (!s || s.length < 32) {
    return { pitchHz: 0, pitchVarHz: 0, energyRms: 0, zeroCrossingRate: 0, voiced: false };
  }
  let sumSq = 0;
  let zc = 0;
  let prev = s[0];
  for (let i = 1; i < s.length; i++) {
    const cur = s[i];
    sumSq += cur * cur;
    if ((cur >= 0) !== (prev >= 0)) zc++;
    prev = cur;
  }
  const rms = Math.sqrt(sumSq / s.length);
  const zcr = zc / s.length;
  const voiced = rms > 0.02;
  const pitchHz = voiced ? autocorrPitch(s, frame.sampleRate) : 0;
  return { pitchHz, pitchVarHz: 0, energyRms: rms, zeroCrossingRate: zcr, voiced };
}

export function rollupProsody(frames: ProsodyFeatures[]): ProsodyFeatures {
  const voiced = frames.filter((f) => f.voiced);
  if (voiced.length === 0) {
    return { pitchHz: 0, pitchVarHz: 0, energyRms: 0, zeroCrossingRate: 0, voiced: false };
  }
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const pitches = voiced.map((f) => f.pitchHz).filter((p) => p > 0);
  const pitchMean = pitches.length ? mean(pitches) : 0;
  const pitchVar = pitches.length
    ? mean(pitches.map((p) => (p - pitchMean) ** 2))
    : 0;
  return {
    pitchHz: pitchMean,
    pitchVarHz: pitchVar,
    energyRms: mean(voiced.map((f) => f.energyRms)),
    zeroCrossingRate: mean(voiced.map((f) => f.zeroCrossingRate)),
    voiced: true,
  };
}

/** Simple autocorrelation-based pitch estimator over 50–500 Hz. */
function autocorrPitch(s: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);
  let bestLag = 0;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag && lag < s.length; lag++) {
    let sum = 0;
    for (let i = 0; i < s.length - lag; i++) sum += s[i] * s[i + lag];
    if (sum > bestScore) {
      bestScore = sum;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? sampleRate / bestLag : 0;
}

/** Deterministic prosody → emotion mapping. */
export function prosodyEmotion(f: ProsodyFeatures): {
  label: string;
  valence: number;
  arousal: number;
  confidence: number;
} {
  if (!f.voiced) return { label: "neutral", valence: 0, arousal: 0, confidence: 0.2 };
  const arousal = clamp01(0.5 * (f.energyRms * 4) + 0.5 * (f.zeroCrossingRate * 4));
  // High-pitch + low energy → nervous; low pitch + high energy → assertive/angry.
  const pitchTilt = f.pitchHz > 220 ? 0.3 : f.pitchHz < 130 ? -0.2 : 0;
  const valence = arousal > 0.75 && f.pitchHz < 150 ? -0.4 : pitchTilt + (arousal > 0.6 ? 0.1 : 0);
  let label = "neutral";
  if (arousal > 0.7 && valence < -0.1) label = "angry";
  else if (arousal > 0.7 && valence > 0.1) label = "excited";
  else if (arousal < 0.3) label = "calm";
  else if (valence > 0.15) label = "positive";
  else if (valence < -0.15) label = "tense";
  return { label, valence: clamp(valence, -1, 1), arousal, confidence: 0.55 };
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
