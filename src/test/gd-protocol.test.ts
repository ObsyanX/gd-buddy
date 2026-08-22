import { describe, it, expect } from 'vitest';
import {
  GD_FORMATS,
  getFormat,
  computeWindows,
  clockState,
  closingOrder,
  activeClosingSlot,
  airtimeReport,
  moderatorInterjection,
  formatClock,
} from '@/lib/discussion/gd-protocol';

const START = new Date('2026-01-01T10:00:00.000Z').getTime();
const parts = [
  { id: 'a', is_user: false, persona_name: 'Aditya', order_index: 1 },
  { id: 'b', is_user: false, persona_name: 'Priya', order_index: 2 },
  { id: 'u', is_user: true, persona_name: 'You', order_index: 0 },
];

describe('gd-protocol formats', () => {
  it('falls back to free_form for unknown ids', () => {
    expect(getFormat('nope').id).toBe('free_form');
    expect(getFormat('case_study')).toBe(GD_FORMATS.case_study);
  });
});

describe('clock stages', () => {
  const w = computeWindows(START, 'free_form', 3);

  it('locks the mic during the reading window', () => {
    const c = clockState(START + 5_000, w);
    expect(c.stage).toBe('reading');
    expect(c.micLocked).toBe(true);
    expect(c.secondsInStage).toBe(55);
  });

  it('opens the floor after reading', () => {
    const c = clockState(w.readingEndsMs + 1_000, w);
    expect(c.stage).toBe('discussion');
    expect(c.micLocked).toBe(false);
  });

  it('raises the 2-minute and 30-second warnings', () => {
    expect(clockState(w.closingStartsMs - 100_000, w).stage).toBe('warning_2m');
    expect(clockState(w.closingStartsMs - 20_000, w).stage).toBe('warning_30s');
  });

  it('enters closing then over', () => {
    expect(clockState(w.closingStartsMs + 1_000, w).stage).toBe('closing');
    expect(clockState(w.hardStopMs + 1_000, w).stage).toBe('over');
    expect(clockState(w.hardStopMs + 1_000, w).secondsRemaining).toBe(0);
  });
});

describe('closing round-robin', () => {
  const w = computeWindows(START, 'free_form', 3);
  const slots = closingOrder(parts, w);

  it('puts the human last and gives everyone one slot', () => {
    expect(slots.map((s) => s.participantId)).toEqual(['a', 'b', 'u']);
    expect(slots).toHaveLength(3);
  });

  it('resolves the active slot by time', () => {
    expect(activeClosingSlot(w.closingStartsMs + 1_000, slots)?.participantId).toBe('a');
    expect(activeClosingSlot(w.closingStartsMs + 65_000, slots)?.participantId).toBe('u');
    expect(activeClosingSlot(w.hardStopMs + 1, slots)).toBeNull();
  });
});

describe('airtime enforcement', () => {
  const word = (n: number) => Array.from({ length: n }, () => 'point').join(' ');

  it('stays neutral below the judgement threshold', () => {
    const r = airtimeReport(parts, [{ participant_id: 'a', text: word(10) }]);
    expect(r.hogs).toHaveLength(0);
    expect(r.silent).toHaveLength(0);
    expect(moderatorInterjection(r)).toBeNull();
  });

  it('flags a hog and a silent participant', () => {
    const r = airtimeReport(parts, [
      { participant_id: 'a', text: word(300) },
      { participant_id: 'b', text: word(90) },
    ]);
    expect(r.hogs.map((x) => x.participantId)).toContain('a');
    expect(r.silent.map((x) => x.participantId)).toContain('u');
    expect(moderatorInterjection(r)).toContain('Aditya');
  });

  it('ignores skipped turns', () => {
    const r = airtimeReport(parts, [{ participant_id: 'u', text: '[Skipped turn]' }]);
    expect(r.totalWords).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats mm:ss and clamps negatives', () => {
    expect(formatClock(95)).toBe('1:35');
    expect(formatClock(-5)).toBe('0:00');
  });
});
