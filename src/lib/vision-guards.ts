// Slice 7: Vision & security guards
//
// Two responsibilities:
//   1. Turn raw MediaPipe / video-analyzer signals (gaze, head pose, blink
//      rate, presence) into a rolling engagement score with clear thresholds.
//   2. Anti-bot / anti-spoof heuristics: detect frozen frames, missing face,
//      identical-frame streams (replay attacks), and abnormally still audio.

export interface VisionFrameSignal {
  ts: number;             // ms epoch
  face_present: boolean;
  gaze_on_screen: boolean; // eyes roughly forward
  head_yaw_deg?: number;   // 0 = facing camera
  head_pitch_deg?: number;
  blink_rate_hz?: number;  // blinks per second, rolling
  frame_hash?: string;     // perceptual hash of the current frame
}

export interface EngagementSnapshot {
  score: number;         // 0..1
  presence_ratio: number; // 0..1 fraction of frames with a face
  gaze_ratio: number;     // 0..1 fraction of frames looking at screen
  head_stability: number; // 0..1 (1 = very still, 0 = wobbling)
  reasons: string[];      // human-readable notes for the report
}

const WINDOW_MS = 15_000;

export function computeEngagement(frames: VisionFrameSignal[], now = Date.now()): EngagementSnapshot {
  const window = frames.filter((f) => now - f.ts <= WINDOW_MS);
  const reasons: string[] = [];
  if (window.length === 0) {
    return { score: 0, presence_ratio: 0, gaze_ratio: 0, head_stability: 0, reasons: ["no_frames"] };
  }

  const presence_ratio = window.filter((f) => f.face_present).length / window.length;
  const gaze_ratio =
    window.filter((f) => f.face_present && f.gaze_on_screen).length /
    Math.max(1, window.filter((f) => f.face_present).length);

  const yaws = window.map((f) => f.head_yaw_deg ?? 0);
  const yawVar = variance(yaws);
  const head_stability = clamp01(1 - Math.min(1, yawVar / 400));

  if (presence_ratio < 0.6) reasons.push("often_off_camera");
  if (gaze_ratio < 0.5 && presence_ratio > 0.6) reasons.push("looking_away");
  if (head_stability < 0.4) reasons.push("restless_head_motion");

  const score = clamp01(0.45 * presence_ratio + 0.4 * gaze_ratio + 0.15 * head_stability);
  return { score, presence_ratio, gaze_ratio, head_stability, reasons };
}

// ---- Anti-bot / anti-spoof ------------------------------------------------

export interface SpoofSignal {
  frames: VisionFrameSignal[];
  audio_rms_series?: number[]; // rolling RMS values
}

export interface SpoofVerdict {
  suspicious: boolean;
  score: number;   // 0..1 (1 = highly suspicious)
  reasons: string[];
}

export function detectSpoof({ frames, audio_rms_series = [] }: SpoofSignal): SpoofVerdict {
  const reasons: string[] = [];
  let score = 0;

  if (frames.length >= 5) {
    // 1. Frozen frame: identical perceptual hash for >80% of the window.
    const hashes = frames.map((f) => f.frame_hash).filter(Boolean) as string[];
    if (hashes.length) {
      const top = mode(hashes);
      const ratio = hashes.filter((h) => h === top).length / hashes.length;
      if (ratio > 0.8) {
        reasons.push("frozen_or_replayed_video");
        score += 0.6;
      }
    }

    // 2. Face permanently absent while session claims active participation.
    const absentRatio = frames.filter((f) => !f.face_present).length / frames.length;
    if (absentRatio > 0.9) {
      reasons.push("no_face_detected");
      score += 0.3;
    }

    // 3. Zero blinks over a long window is biologically suspicious.
    const blinkAvg =
      frames.reduce((a, f) => a + (f.blink_rate_hz ?? 0), 0) / frames.length;
    if (frames.length > 30 && blinkAvg < 0.02) {
      reasons.push("no_blinks_detected");
      score += 0.2;
    }
  }

  // 4. Flat-line audio (loopback / silence generator).
  if (audio_rms_series.length >= 20) {
    const v = variance(audio_rms_series);
    if (v < 1e-6) {
      reasons.push("flatline_audio");
      score += 0.3;
    }
  }

  return { suspicious: score >= 0.6, score: clamp01(score), reasons };
}

// ---- utils ----------------------------------------------------------------

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
}
function mode<T>(xs: T[]): T {
  const counts = new Map<T, number>();
  let best = xs[0];
  let bestN = 0;
  for (const x of xs) {
    const n = (counts.get(x) ?? 0) + 1;
    counts.set(x, n);
    if (n > bestN) { best = x; bestN = n; }
  }
  return best;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
