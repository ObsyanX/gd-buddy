import { invokeWithAuth } from '@/lib/supabase-auth';
import type { Phase } from '@/lib/phase-machine';

export type PhaseEventName =
  | 'start'
  | 'intro_taken'
  | 'intro_timeout'
  | 'intro_done'
  | 'timer_low'
  | 'host_conclude'
  | 'conclusion_done'
  | 'extend';

/**
 * Sends a phase-machine event to the server. Slice 3.
 * The server validates the transition, updates gd_sessions.phase, and
 * broadcasts the appropriate moderator prompt (intro / final remarks /
 * neutral summary) as a system message on gd_messages.
 */
export async function sendPhaseEvent(session_id: string, event: PhaseEventName) {
  const { data, error } = await invokeWithAuth('session-phase', {
    body: { session_id, event },
  });
  if (error) throw error;
  return data as { status: string; phase?: Phase };
}
