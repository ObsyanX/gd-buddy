/**
 * Logical fallacy detector — heuristic pre-filter that runs before AI classification.
 *
 * The AI (`fallacy-detector` edge function) makes the final call, but this
 * pure filter cheaply rejects utterances that are highly unlikely to contain
 * fallacies, saving tokens.
 */

export type FallacyType =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dichotomy'
  | 'appeal_to_authority'
  | 'appeal_to_emotion'
  | 'hasty_generalization'
  | 'slippery_slope'
  | 'circular_reasoning'
  | 'red_herring'
  | 'whataboutism';

export interface FallacyHint {
  type: FallacyType;
  confidence: number; // pre-AI heuristic confidence
  snippet: string;
}

const PATTERNS: Array<{ type: FallacyType; regex: RegExp }> = [
  { type: 'ad_hominem', regex: /\byou('re| are)? (stupid|dumb|ignorant|clueless|biased)\b/i },
  { type: 'ad_hominem', regex: /\b(only|typical) (a )?(fool|idiot) would\b/i },
  { type: 'straw_man', regex: /\bso (you|you're) saying (that )?\b/i },
  { type: 'false_dichotomy', regex: /\beither .{2,40} or .{2,40}\b/i },
  { type: 'false_dichotomy', regex: /\bthere are only two (options|choices)\b/i },
  { type: 'appeal_to_authority', regex: /\b(everyone|experts?) (say|know|agree)s?\b/i },
  { type: 'appeal_to_emotion', regex: /\b(think of the (children|kids|families))\b/i },
  { type: 'hasty_generalization', regex: /\ball (of )?(them|those|these) (people|guys|folks)\b/i },
  { type: 'slippery_slope', regex: /\b(if we (allow|permit)|next thing|before you know it)\b/i },
  { type: 'circular_reasoning', regex: /\bbecause (it is|it's) (true|right|correct)\b/i },
  { type: 'red_herring', regex: /\b(anyway|besides), what about\b/i },
  { type: 'whataboutism', regex: /\bwhat about\b.{0,60}\?/i },
];

export function scanFallacies(text: string): FallacyHint[] {
  if (!text) return [];
  const hints: FallacyHint[] = [];
  const seen = new Set<FallacyType>();
  for (const { type, regex } of PATTERNS) {
    const m = text.match(regex);
    if (m && !seen.has(type)) {
      seen.add(type);
      hints.push({ type, confidence: 0.5, snippet: m[0] });
    }
  }
  return hints;
}

/**
 * Extract likely factual claims (numeric, comparative, absolute) that a
 * fact-checker should verify. Filters out opinions and hedges.
 */
export function extractFactualClaims(text: string): string[] {
  if (!text) return [];
  const HEDGES = /\b(i think|i feel|in my opinion|maybe|perhaps|might|could be)\b/i;
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sentences.filter((s) => {
    if (HEDGES.test(s)) return false;
    // Contains a number, percentage, year, comparative, or absolute?
    return /\b(\d+(\.\d+)?%?|\d{4}|\bin \d{4}\b|most|all|none|every|never|always)\b/i.test(s);
  });
}
