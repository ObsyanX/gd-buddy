import { describe, expect, it } from 'vitest';
import { initialPhaseState, reducePhase } from '@/lib/phase-machine';

describe('phase-machine', () => {
  it('starts in lobby and advances to intro on START', () => {
    const s = reducePhase(initialPhaseState(), { type: 'START' });
    expect(s.phase).toBe('intro');
  });

  it('assigns AI as introducer on timeout when no volunteer', () => {
    let s = reducePhase(initialPhaseState(), { type: 'START' });
    s = reducePhase(s, { type: 'INTRO_TIMEOUT' });
    expect(s.intro_by).toBe('ai');
  });

  it('does not override a human volunteer on later timeout', () => {
    let s = reducePhase(initialPhaseState(), { type: 'START' });
    s = reducePhase(s, { type: 'INTRO_TAKEN', by: 'human' });
    s = reducePhase(s, { type: 'INTRO_TIMEOUT' });
    expect(s.intro_by).toBe('human');
  });

  it('moves intro -> discussion -> conclusion -> ended', () => {
    let s = reducePhase(initialPhaseState(), { type: 'START' });
    s = reducePhase(s, { type: 'INTRO_TAKEN', by: 'ai' });
    s = reducePhase(s, { type: 'INTRO_DONE' });
    expect(s.phase).toBe('discussion');
    s = reducePhase(s, { type: 'TIMER_LOW' });
    expect(s.phase).toBe('conclusion');
    s = reducePhase(s, { type: 'CONCLUSION_DONE' });
    expect(s.phase).toBe('ended');
  });

  it('allows a single extension from conclusion back to discussion', () => {
    let s = reducePhase(initialPhaseState(), { type: 'START' });
    s = reducePhase(s, { type: 'INTRO_DONE' });
    s = reducePhase(s, { type: 'HOST_CONCLUDE' });
    expect(s.phase).toBe('conclusion');
    s = reducePhase(s, { type: 'EXTEND', seconds: 120 });
    expect(s.phase).toBe('discussion');
    expect(s.extension_used).toBe(true);
    // second extension is ignored
    s = reducePhase(s, { type: 'HOST_CONCLUDE' });
    s = reducePhase(s, { type: 'EXTEND', seconds: 120 });
    expect(s.phase).toBe('conclusion');
  });

  it('is a no-op once ended', () => {
    let s = reducePhase(initialPhaseState(), { type: 'START' });
    s = reducePhase(s, { type: 'INTRO_DONE' });
    s = reducePhase(s, { type: 'HOST_CONCLUDE' });
    s = reducePhase(s, { type: 'CONCLUSION_DONE' });
    const after = reducePhase(s, { type: 'START' });
    expect(after.phase).toBe('ended');
  });
});
