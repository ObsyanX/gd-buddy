import { describe, it, expect } from 'vitest';
import { cosine, findDuplicate, topKRelevant } from '@/lib/memory/similarity';
import { scanFallacies, extractFactualClaims } from '@/lib/memory/fallacies';

function vec(dim: number, seed: number): number[] {
  const out = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) out[i] = Math.sin(seed + i);
  const n = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / n);
}

describe('cosine similarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = vec(16, 1);
    expect(cosine(v, v)).toBeCloseTo(1, 5);
  });
  it('returns 0 for zero-length inputs', () => {
    expect(cosine([], [])).toBe(0);
  });
  it('is lower for dissimilar vectors', () => {
    expect(cosine(vec(32, 1), vec(32, 999))).toBeLessThan(1);
  });
});

describe('findDuplicate', () => {
  const base = vec(16, 42);
  const history = [
    { message_id: 'm1', content: 'AI will replace jobs', embedding: base, user_id: 'u1', ts: 1 },
    { message_id: 'm2', content: 'Cats are great', embedding: vec(16, 100), user_id: 'u2', ts: 2 },
  ];

  it('flags near-identical embeddings above threshold', () => {
    const dup = findDuplicate(
      { message_id: 'm3', content: 'AI is taking jobs', embedding: base },
      history,
      0.86,
    );
    expect(dup).not.toBeNull();
    expect(dup!.original_message_id).toBe('m1');
    expect(dup!.similarity).toBeGreaterThanOrEqual(0.86);
  });

  it('returns null when nothing crosses threshold', () => {
    const dup = findDuplicate(
      { message_id: 'm3', content: 'Weather is fine', embedding: vec(16, 500) },
      history,
      0.99,
    );
    expect(dup).toBeNull();
  });

  it('topKRelevant returns sorted matches', () => {
    const top = topKRelevant(base, history, 2);
    expect(top[0].row.message_id).toBe('m1');
    expect(top[0].sim).toBeGreaterThanOrEqual(top[1].sim);
  });
});

describe('scanFallacies', () => {
  it('detects ad hominem', () => {
    const h = scanFallacies("You're clueless if you believe that.");
    expect(h.some((x) => x.type === 'ad_hominem')).toBe(true);
  });
  it('detects false dichotomy', () => {
    const h = scanFallacies('Either we ban it entirely or we destroy the economy.');
    expect(h.some((x) => x.type === 'false_dichotomy')).toBe(true);
  });
  it('detects whataboutism', () => {
    const h = scanFallacies('What about the other side of the story?');
    expect(h.some((x) => x.type === 'whataboutism')).toBe(true);
  });
  it('returns empty for clean utterance', () => {
    expect(scanFallacies('I believe collaboration produces better outcomes.')).toEqual([]);
  });
});

describe('extractFactualClaims', () => {
  it('picks numeric claims', () => {
    const c = extractFactualClaims('Sales grew 42% in 2024. I think that is amazing.');
    expect(c.length).toBe(1);
    expect(c[0]).toMatch(/42%/);
  });
  it('skips hedged opinions', () => {
    expect(extractFactualClaims('I think 5% growth is fine.')).toEqual([]);
  });
});
