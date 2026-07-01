// Slice 8: Scoring hardening (anti-gaming) + idempotency utilities.
//
// Two goals:
//   1. Penalise low-effort or gamed contributions: near-duplicate content,
//      copy-paste of another speaker, template-y filler, or metric spam.
//   2. Provide a stable idempotency key generator so retried edge-function
//      calls (scoring, TTS, report writes) don't double-count.

// ---- Anti-gaming novelty --------------------------------------------------

export interface ScoredTurn {
  participant_id: string;
  text: string;
  duration_ms: number;
}

export interface AntiGamingResult {
  penalty: number;      // 0..1 subtract this from novelty score
  flags: string[];      // human-readable flags for the report
  duplicate_of?: string; // participant_id of the source they echoed, if any
}

// Small, dependency-free bag-of-words Jaccard. Good enough for near-dup
// detection at conversation scale (<200 turns).
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const FILLER_RE = /^(i (agree|think|feel) that|as (he|she|they) said|to add to that|basically|you know|kind of|sort of)\b/i;

export function assessTurn(turn: ScoredTurn, priorTurns: ScoredTurn[]): AntiGamingResult {
  const flags: string[] = [];
  let penalty = 0;
  let duplicate_of: string | undefined;

  const text = (turn.text ?? "").trim();
  const t = tokens(text);

  // 1. Too short to score honestly.
  if (text.length < 15 || t.size < 4) {
    flags.push("too_short");
    penalty += 0.4;
  }

  // 2. Very fast, unrealistic speaking pace (likely pasted).
  const wps = t.size / Math.max(0.1, turn.duration_ms / 1000);
  if (wps > 6) {
    flags.push("unrealistic_pace");
    penalty += 0.2;
  }

  // 3. Filler / echo opener.
  if (FILLER_RE.test(text)) {
    flags.push("filler_opener");
    penalty += 0.1;
  }

  // 4. Near-duplicate of a prior speaker.
  for (const prev of priorTurns.slice(-20)) {
    if (prev.participant_id === turn.participant_id) continue;
    const sim = jaccard(t, tokens(prev.text));
    if (sim >= 0.7) {
      flags.push("echoed_prior_speaker");
      duplicate_of = prev.participant_id;
      penalty += 0.3;
      break;
    }
  }

  // 5. Self-repetition (participant restating their own last turn).
  const ownLast = [...priorTurns].reverse().find((p) => p.participant_id === turn.participant_id);
  if (ownLast) {
    const sim = jaccard(t, tokens(ownLast.text));
    if (sim >= 0.8) {
      flags.push("self_repetition");
      penalty += 0.2;
    }
  }

  return { penalty: Math.min(1, penalty), flags, duplicate_of };
}

// ---- Idempotency ---------------------------------------------------------

/**
 * Stable key for a (session, participant, action, window) tuple so retried
 * scoring / TTS / notification writes deduplicate on the server.
 * Window is quantised to the nearest `bucketMs` so retries within the same
 * bucket collide, but genuinely new events don't.
 */
export function idempotencyKey(parts: {
  session_id: string;
  participant_id?: string | null;
  action: string;
  bucketMs?: number;
  now?: number;
}): string {
  const { session_id, participant_id = "-", action, bucketMs = 2_000, now = Date.now() } = parts;
  const bucket = Math.floor(now / bucketMs);
  return `${session_id}:${participant_id}:${action}:${bucket}`;
}
