// Phase B — speculative generation.
//
// Real GD participants start forming their reply while you are still talking.
// We approximate that: once an interim transcript is long enough and stable,
// we fire the conductor request early. When the user finally sends, if the
// final text is close enough to what we speculated on, we reuse the in-flight
// (often already finished) response instead of starting from zero.

export interface SpeculationRequest {
  body: Record<string, unknown>;
  invoke: (body: Record<string, unknown>) => Promise<{ data: any; error: any }>;
}

interface Speculation {
  text: string;
  promise: Promise<{ data: any; error: any }>;
  createdAt: number;
}

const MIN_WORDS = 12;         // don't speculate on "yes" / "I think"
const MAX_AGE_MS = 45_000;    // stale speculation is worse than none
const MIN_SIMILARITY = 0.82;  // final vs speculated transcript

let current: Speculation | null = null;

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []);
}

/** Jaccard-style prefix similarity between the speculated and final text. */
export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const setB = new Set(wb);
  let hits = 0;
  for (const w of new Set(wa)) if (setB.has(w)) hits++;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : hits / union;
}

/**
 * Fire a conductor request from an interim transcript. Safe to call often —
 * it no-ops when the text is too short or barely changed from the last one.
 */
export function speculate(interimText: string, req: SpeculationRequest): void {
  const text = interimText.trim();
  if (words(text).length < MIN_WORDS) return;
  if (current && similarity(current.text, text) > 0.95) return;

  const promise = req
    .invoke({ ...req.body, latest_user_utterance: text })
    .catch((error) => ({ data: null, error }));

  current = { text, promise, createdAt: Date.now() };
}

/**
 * Claim a speculation for the final utterance. Returns the in-flight promise
 * when it was based on essentially the same text, otherwise null (caller
 * makes the normal request). Always consumes the pending speculation.
 */
export function claimSpeculation(finalText: string): Promise<{ data: any; error: any }> | null {
  const spec = current;
  current = null;
  if (!spec) return null;
  if (Date.now() - spec.createdAt > MAX_AGE_MS) return null;
  if (similarity(spec.text, finalText) < MIN_SIMILARITY) return null;
  return spec.promise;
}

export function clearSpeculation(): void {
  current = null;
}
