// Pure, unit-testable phase state machine for a GD session.
// Slice 2 of the edge-case hardening plan.
//
// Phases:
//   lobby       — waiting for participants to join
//   intro       — someone (human or AI) introduces the topic (≤ 60s)
//   discussion  — main body of the GD
//   conclusion  — final remarks phase (≤ 90s)
//   ended       — report generation begins
//
// Transitions are driven by explicit events so the machine is easy to test
// and the server (gd-conductor) can drive it deterministically.

export type Phase = 'lobby' | 'intro' | 'discussion' | 'conclusion' | 'ended';

export type PhaseEvent =
  | { type: 'START' }                      // host clicks "Start"
  | { type: 'INTRO_TAKEN'; by: 'human' | 'ai' }
  | { type: 'INTRO_TIMEOUT' }              // 10s with no volunteer -> AI intros
  | { type: 'INTRO_DONE' }
  | { type: 'TIMER_LOW' }                  // ≤ 90s left on session timer
  | { type: 'HOST_CONCLUDE' }
  | { type: 'AI_DETECTS_END' }             // natural end detected
  | { type: 'CONCLUSION_DONE' }
  | { type: 'EXTEND'; seconds: number };   // +2min extension (once)

export interface PhaseState {
  phase: Phase;
  intro_by: 'human' | 'ai' | null;
  extension_used: boolean;
  entered_at: number;                      // ms epoch
}

export const initialPhaseState = (): PhaseState => ({
  phase: 'lobby',
  intro_by: null,
  extension_used: false,
  entered_at: Date.now(),
});

const enter = (s: PhaseState, phase: Phase, patch: Partial<PhaseState> = {}): PhaseState => ({
  ...s,
  phase,
  entered_at: Date.now(),
  ...patch,
});

export function reducePhase(state: PhaseState, event: PhaseEvent): PhaseState {
  switch (state.phase) {
    case 'lobby':
      if (event.type === 'START') return enter(state, 'intro');
      return state;

    case 'intro':
      if (event.type === 'INTRO_TAKEN') return { ...state, intro_by: event.by };
      if (event.type === 'INTRO_TIMEOUT' && !state.intro_by) return { ...state, intro_by: 'ai' };
      if (event.type === 'INTRO_DONE') return enter(state, 'discussion');
      return state;

    case 'discussion':
      if (event.type === 'TIMER_LOW' || event.type === 'HOST_CONCLUDE' || event.type === 'AI_DETECTS_END') {
        return enter(state, 'conclusion');
      }
      if (event.type === 'EXTEND' && !state.extension_used) {
        return { ...state, extension_used: true };
      }
      return state;

    case 'conclusion':
      if (event.type === 'CONCLUSION_DONE') return enter(state, 'ended');
      if (event.type === 'EXTEND' && !state.extension_used) {
        // one-time extension pulls us back into discussion
        return enter(state, 'discussion', { extension_used: true });
      }
      return state;

    case 'ended':
    default:
      return state;
  }
}

// Timing caps used by the conductor when driving auto-transitions.
export const PHASE_LIMITS_MS = {
  intro_wait_for_volunteer: 10_000,
  intro_cap: 60_000,
  conclusion_cap: 90_000,
  extension: 120_000,
} as const;
