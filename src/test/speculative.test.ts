import { describe, it, expect, beforeEach } from 'vitest';
import { speculate, claimSpeculation, clearSpeculation, similarity } from '@/lib/discussion/speculative';

const LONG = 'automation will displace routine jobs but it also creates new roles in maintenance and oversight';

function req(spy: { calls: any[] }) {
  return {
    body: { session_id: 's1' },
    invoke: async (body: Record<string, unknown>) => {
      spy.calls.push(body);
      return { data: { ok: true, for: body.latest_user_utterance }, error: null };
    },
  };
}

describe('speculative generation', () => {
  beforeEach(() => clearSpeculation());

  it('ignores short utterances', () => {
    const spy = { calls: [] as any[] };
    speculate('yes I agree', req(spy));
    expect(spy.calls).toHaveLength(0);
    expect(claimSpeculation('yes I agree')).toBeNull();
  });

  it('fires on a long interim transcript and is reusable for a close final', async () => {
    const spy = { calls: [] as any[] };
    speculate(LONG, req(spy));
    expect(spy.calls).toHaveLength(1);
    const claimed = claimSpeculation(LONG + ' overall.');
    expect(claimed).not.toBeNull();
    await expect(claimed!).resolves.toMatchObject({ error: null });
  });

  it('does not reuse a speculation for an unrelated final utterance', () => {
    const spy = { calls: [] as any[] };
    speculate(LONG, req(spy));
    expect(claimSpeculation('remote work policy should be decided by each team leader alone')).toBeNull();
  });

  it('consumes the speculation so it is claimed only once', () => {
    const spy = { calls: [] as any[] };
    speculate(LONG, req(spy));
    expect(claimSpeculation(LONG)).not.toBeNull();
    expect(claimSpeculation(LONG)).toBeNull();
  });

  it('skips re-firing when the interim text barely changed', () => {
    const spy = { calls: [] as any[] };
    speculate(LONG, req(spy));
    speculate(LONG, req(spy));
    expect(spy.calls).toHaveLength(1);
  });

  it('similarity is bounded between 0 and 1', () => {
    expect(similarity('', 'abc')).toBe(0);
    expect(similarity('abc def', 'abc def')).toBe(1);
    expect(similarity('abc def', 'ghi jkl')).toBe(0);
  });
});
