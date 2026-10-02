/**
 * Published list prices used for cost ESTIMATES only (USD). Providers change
 * prices; the UI always labels results as estimates and links to the
 * provider's own billing page for exact figures.
 *
 * text/vision: price per 1M tokens (input, output)
 * voice: price per 1K characters; stt: price per audio minute
 * Per-request fallbacks assume a typical GD turn when the provider does not
 * report token/character counts: ~300 characters spoken, ~20 s of audio,
 * ~1.2K input + 150 output tokens for a camera frame.
 */
export type PriceCategory = 'text' | 'voice' | 'stt' | 'vision';

interface Price { category: PriceCategory; inPerM?: number; outPerM?: number; per1kChars?: number; perMin?: number; free?: boolean }

export const PRICES: Record<string, Price> = {
  groq: { category: 'text', inPerM: 0.59, outPerM: 0.79 },
  openai: { category: 'text', inPerM: 0.15, outPerM: 0.6 },
  gemini: { category: 'text', inPerM: 0.3, outPerM: 2.5 },
  mistral: { category: 'text', inPerM: 0.4, outPerM: 2.0 },
  anthropic: { category: 'text', inPerM: 3.0, outPerM: 15.0 },
  cerebras: { category: 'text', inPerM: 0.85, outPerM: 1.2 },
  elevenlabs: { category: 'voice', per1kChars: 0.3 },
  openai_tts: { category: 'voice', per1kChars: 0.015 },
  google_tts: { category: 'voice', per1kChars: 0.016 },
  sarvam_tts: { category: 'voice', per1kChars: 0.18 },
  groq_whisper: { category: 'stt', perMin: 0.00067 },
  openai_whisper: { category: 'stt', perMin: 0.006 },
  deepgram: { category: 'stt', perMin: 0.0043 },
  assemblyai: { category: 'stt', perMin: 0.0062 },
  openai_vision: { category: 'vision', inPerM: 0.15, outPerM: 0.6 },
  gemini_vision: { category: 'vision', inPerM: 0.3, outPerM: 2.5 },
};

const TYPICAL = { chars: 300, minutes: 20 / 60, textIn: 800, textOut: 200, visionIn: 1200, visionOut: 150 };

export interface UsageRow { requests: number; errors: number; tokens: number }

/** Estimated USD spent for the given 30-day usage of one provider. */
export function estimateCost(provider: string, u: UsageRow): number | null {
  const p = PRICES[provider];
  if (!p) return null;
  const ok = Math.max(0, u.requests - u.errors);
  if (p.category === 'voice') return ok * (TYPICAL.chars / 1000) * (p.per1kChars ?? 0);
  if (p.category === 'stt') return ok * TYPICAL.minutes * (p.perMin ?? 0);
  const inP = p.inPerM ?? 0, outP = p.outPerM ?? 0;
  if (u.tokens > 0) {
    // Tokens are reported as a total; assume an 80/20 input/output split.
    return (u.tokens * 0.8 * inP + u.tokens * 0.2 * outP) / 1_000_000;
  }
  const [i, o] = p.category === 'vision' ? [TYPICAL.visionIn, TYPICAL.visionOut] : [TYPICAL.textIn, TYPICAL.textOut];
  return (ok * (i * inP + o * outP)) / 1_000_000;
}

/** Estimated USD for one typical 15-minute practice session on this provider. */
export function estimateSession(provider: string): number | null {
  const p = PRICES[provider];
  if (!p) return null;
  // ~30 AI turns, ~15 user utterances, ~100 camera frames (one per 8 s)
  if (p.category === 'voice') return 30 * (TYPICAL.chars / 1000) * (p.per1kChars ?? 0);
  if (p.category === 'stt') return 15 * TYPICAL.minutes * (p.perMin ?? 0);
  const [n, i, o] = p.category === 'vision' ? [100, TYPICAL.visionIn, TYPICAL.visionOut] : [40, 1500, 250];
  return (n * (i * (p.inPerM ?? 0) + o * (p.outPerM ?? 0))) / 1_000_000;
}

export const fmtUsd = (v: number) => (v < 0.01 && v > 0 ? '<$0.01' : `$${v.toFixed(2)}`);
