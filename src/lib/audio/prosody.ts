// Phase B — turn the conductor's `tts_ssml` into playback parameters.
//
// We don't send SSML to the TTS provider (ElevenLabs ignores most of it), so
// we read the prosody hints out of it and apply them in the Web Audio graph:
// `rate` -> playbackRate, `pitch` -> detune (cents).

export interface ProsodyHints {
  rate: number;   // multiplier, 1 = normal
  detune: number; // cents, 0 = normal
}

const NAMED_RATE: Record<string, number> = {
  'x-slow': 0.7, slow: 0.85, medium: 1, fast: 1.15, 'x-fast': 1.3,
};

const NAMED_PITCH: Record<string, number> = {
  'x-low': -300, low: -150, medium: 0, high: 150, 'x-high': 300,
};

/** Extract rate/pitch from an SSML string (or persona voice percentages). */
export function parseProsody(ssml?: string | null, ratePct?: number | null, pitchPct?: number | null): ProsodyHints {
  let rate = ratePct ? clamp(ratePct / 100, 0.6, 1.6) : 1;
  let detune = pitchPct ? clamp(pitchPct, -50, 50) * 10 : 0;

  if (ssml) {
    const rateMatch = ssml.match(/rate\s*=\s*"([^"]+)"/i);
    if (rateMatch) {
      const raw = rateMatch[1].trim().toLowerCase();
      if (NAMED_RATE[raw] !== undefined) rate = NAMED_RATE[raw];
      else if (raw.endsWith('%')) rate = clamp(parseFloat(raw) / 100, 0.6, 1.6) || rate;
    }
    const pitchMatch = ssml.match(/pitch\s*=\s*"([^"]+)"/i);
    if (pitchMatch) {
      const raw = pitchMatch[1].trim().toLowerCase();
      if (NAMED_PITCH[raw] !== undefined) detune = NAMED_PITCH[raw];
      else if (raw.endsWith('st')) detune = clamp(parseFloat(raw), -6, 6) * 100;
      else if (raw.endsWith('%')) detune = clamp(parseFloat(raw), -50, 50) * 10;
    }
  }

  return { rate: Number.isFinite(rate) ? rate : 1, detune: Number.isFinite(detune) ? detune : 0 };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
