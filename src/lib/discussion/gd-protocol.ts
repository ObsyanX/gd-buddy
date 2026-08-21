// Phase D — Authentic GD protocol & timing.
//
// Pure, unit-testable helpers that model how a real group discussion is run:
//   1. a topic-reading window where the mic is locked,
//   2. a timed open-discussion body with T-2min / T-30s warnings,
//   3. a closing round-robin where every participant gets a fixed slot,
//   4. airtime enforcement so one person cannot own the floor.
//
// No React, no Supabase — the room component and the conductor both consume it.

export type GdFormat = 'free_form' | 'structured' | 'case_study' | 'abstract';

export interface GdFormatSpec {
  id: GdFormat;
  label: string;
  description: string;
  /** Seconds of silent topic reading before anyone may speak. */
  readingSeconds: number;
  /** Seconds of open discussion after the reading window. */
  discussionSeconds: number;
  /** Seconds each participant gets in the closing round-robin. */
  closingSlotSeconds: number;
  /** Structured formats open with a fixed statement round. */
  openingRoundSeconds: number;
}

export const GD_FORMATS: Record<GdFormat, GdFormatSpec> = {
  free_form: {
    id: 'free_form',
    label: 'Free-form GD',
    description: 'Classic open discussion. Grab the floor whenever you can.',
    readingSeconds: 60,
    discussionSeconds: 15 * 60,
    closingSlotSeconds: 30,
    openingRoundSeconds: 0,
  },
  structured: {
    id: 'structured',
    label: 'Structured GD',
    description: 'Opening statement round, then open debate, then closing round.',
    readingSeconds: 60,
    discussionSeconds: 12 * 60,
    closingSlotSeconds: 30,
    openingRoundSeconds: 30,
  },
  case_study: {
    id: 'case_study',
    label: 'Case-study GD',
    description: 'Longer reading window, evidence-led debate, longer summaries.',
    readingSeconds: 120,
    discussionSeconds: 20 * 60,
    closingSlotSeconds: 45,
    openingRoundSeconds: 0,
  },
  abstract: {
    id: 'abstract',
    label: 'Abstract-topic GD',
    description: 'Short reading window, interpretation-driven, fast turns.',
    readingSeconds: 45,
    discussionSeconds: 12 * 60,
    closingSlotSeconds: 30,
    openingRoundSeconds: 0,
  },
};

export const isGdFormat = (v: unknown): v is GdFormat =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(GD_FORMATS, v);

export const getFormat = (v: unknown): GdFormatSpec => GD_FORMATS[isGdFormat(v) ? v : 'free_form'];

export interface ProtocolWindows {
  startMs: number;
  readingEndsMs: number;
  closingStartsMs: number;
  hardStopMs: number;
  format: GdFormatSpec;
  participantCount: number;
}

/** Derive every protocol boundary from the session start time. */
export function computeWindows(
  startedAt: string | number | Date,
  formatId: unknown,
  participantCount: number,
): ProtocolWindows {
  const format = getFormat(formatId);
  const startMs = new Date(startedAt as any).getTime();
  const n = Math.max(1, participantCount || 1);
  const readingEndsMs = startMs + format.readingSeconds * 1000;
  const closingStartsMs = readingEndsMs + format.discussionSeconds * 1000;
  const hardStopMs = closingStartsMs + n * format.closingSlotSeconds * 1000;
  return { startMs, readingEndsMs, closingStartsMs, hardStopMs, format, participantCount: n };
}

export type ClockStage = 'reading' | 'discussion' | 'warning_2m' | 'warning_30s' | 'closing' | 'over';

export interface ClockState {
  stage: ClockStage;
  /** Seconds until the CURRENT stage ends (never negative). */
  secondsInStage: number;
  /** Seconds until the hard stop (never negative). */
  secondsRemaining: number;
  /** True while the mic must stay locked (reading window). */
  micLocked: boolean;
  label: string;
}

const clamp0 = (n: number) => (n > 0 ? Math.ceil(n) : 0);

export function clockState(nowMs: number, w: ProtocolWindows): ClockState {
  const secondsRemaining = clamp0((w.hardStopMs - nowMs) / 1000);

  if (nowMs < w.readingEndsMs) {
    return {
      stage: 'reading',
      secondsInStage: clamp0((w.readingEndsMs - nowMs) / 1000),
      secondsRemaining,
      micLocked: true,
      label: 'Reading the topic',
    };
  }

  if (nowMs < w.closingStartsMs) {
    const toClosing = (w.closingStartsMs - nowMs) / 1000;
    const stage: ClockStage = toClosing <= 30 ? 'warning_30s' : toClosing <= 120 ? 'warning_2m' : 'discussion';
    return {
      stage,
      secondsInStage: clamp0(toClosing),
      secondsRemaining,
      micLocked: false,
      label:
        stage === 'warning_30s'
          ? 'Wrap up — closing round in 30s'
          : stage === 'warning_2m'
            ? '2 minutes left in open discussion'
            : 'Open discussion',
    };
  }

  if (nowMs < w.hardStopMs) {
    return {
      stage: 'closing',
      secondsInStage: clamp0((w.hardStopMs - nowMs) / 1000),
      secondsRemaining,
      micLocked: false,
      label: 'Closing round',
    };
  }

  return { stage: 'over', secondsInStage: 0, secondsRemaining: 0, micLocked: false, label: 'Time' };
}

export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ── Closing round-robin ────────────────────────────────────────────────────

export interface ClosingSlot {
  participantId: string;
  name: string;
  isUser: boolean;
  index: number;
  startsMs: number;
  endsMs: number;
}

/**
 * Fixed summary order: seating order (order_index), with the human last so the
 * user closes the discussion — the way panels usually run the final round.
 */
export function closingOrder<T extends { id: string; is_user?: boolean; persona_name?: string; order_index?: number }>(
  participants: T[],
  w: ProtocolWindows,
): ClosingSlot[] {
  const sorted = [...participants].sort((a, b) => {
    if (!!a.is_user !== !!b.is_user) return a.is_user ? 1 : -1;
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });
  const slotMs = w.format.closingSlotSeconds * 1000;
  return sorted.map((p, i) => ({
    participantId: p.id,
    name: p.persona_name || (p.is_user ? 'You' : 'Participant'),
    isUser: !!p.is_user,
    index: i,
    startsMs: w.closingStartsMs + i * slotMs,
    endsMs: w.closingStartsMs + (i + 1) * slotMs,
  }));
}

export function activeClosingSlot(nowMs: number, slots: ClosingSlot[]): ClosingSlot | null {
  return slots.find((s) => nowMs >= s.startsMs && nowMs < s.endsMs) ?? null;
}

// ── Airtime enforcement ────────────────────────────────────────────────────

export interface AirtimeRow {
  participantId: string;
  name: string;
  isUser: boolean;
  words: number;
  share: number; // 0..1
}

export interface AirtimeReport {
  rows: AirtimeRow[];
  totalWords: number;
  /** Speaking far above a fair share. */
  hogs: AirtimeRow[];
  /** Effectively silent participants. */
  silent: AirtimeRow[];
  fairShare: number;
}

const HOG_MULTIPLIER = 1.8;
const SILENT_MULTIPLIER = 0.35;
const MIN_WORDS_FOR_JUDGEMENT = 120;

export function airtimeReport<
  P extends { id: string; is_user?: boolean; persona_name?: string },
  M extends { participant_id?: string; text?: string | null },
>(participants: P[], messages: M[]): AirtimeReport {
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (!m?.participant_id || !m.text) continue;
    if (m.text.trim() === '[Skipped turn]') continue;
    const words = m.text.trim().split(/\s+/).filter(Boolean).length;
    counts.set(m.participant_id, (counts.get(m.participant_id) ?? 0) + words);
  }
  const totalWords = [...counts.values()].reduce((a, b) => a + b, 0);
  const rows: AirtimeRow[] = participants.map((p) => {
    const words = counts.get(p.id) ?? 0;
    return {
      participantId: p.id,
      name: p.persona_name || (p.is_user ? 'You' : 'Participant'),
      isUser: !!p.is_user,
      words,
      share: totalWords > 0 ? words / totalWords : 0,
    };
  });
  const fairShare = rows.length > 0 ? 1 / rows.length : 0;
  const settled = totalWords >= MIN_WORDS_FOR_JUDGEMENT;
  return {
    rows,
    totalWords,
    fairShare,
    hogs: settled ? rows.filter((r) => r.share >= fairShare * HOG_MULTIPLIER) : [],
    silent: settled ? rows.filter((r) => r.share <= fairShare * SILENT_MULTIPLIER) : [],
  };
}

/** Moderator line to inject when the floor is unbalanced. Null when balanced. */
export function moderatorInterjection(report: AirtimeReport): string | null {
  const hog = report.hogs.slice().sort((a, b) => b.share - a.share)[0];
  const quiet = report.silent.slice().sort((a, b) => a.share - b.share)[0];
  if (hog && quiet) {
    return `${hog.name}, hold that thought — ${quiet.name}, you haven't come in yet. Let's hear you.`;
  }
  if (hog) {
    return `${hog.name}, you've had a long run on the floor. Let's open it up to the rest of the group.`;
  }
  if (quiet) {
    return `${quiet.name}, we haven't heard from you. What's your read on this?`;
  }
  return null;
}
