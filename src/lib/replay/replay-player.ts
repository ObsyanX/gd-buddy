// Track 7: Session replay player. Loads events and provides a scrub API.
import { supabase } from "@/integrations/supabase/client";

export interface ReplayEvent {
  id: string;
  offset_ms: number;
  event_type: string;
  actor_id: string | null;
  actor_kind: string;
  payload: Record<string, unknown>;
}

export interface ReplayHeader {
  id: string;
  session_id: string;
  duration_seconds: number;
  event_count: number;
  summary: Record<string, unknown>;
}

export async function loadReplay(sessionId: string): Promise<{
  header: ReplayHeader | null;
  events: ReplayEvent[];
}> {
  const { data: header, error: hErr } = await supabase
    .from("session_replays")
    .select("id, session_id, duration_seconds, event_count, summary")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (hErr) throw hErr;
  if (!header) return { header: null, events: [] };

  const { data: events, error: eErr } = await supabase
    .from("replay_events")
    .select("id, offset_ms, event_type, actor_id, actor_kind, payload")
    .eq("replay_id", header.id)
    .order("offset_ms", { ascending: true });
  if (eErr) throw eErr;

  return { header: header as ReplayHeader, events: (events ?? []) as ReplayEvent[] };
}

/** Returns the slice of events up to and including the given cursor (ms). */
export function eventsUpTo(events: ReplayEvent[], cursorMs: number): ReplayEvent[] {
  // Binary search for last index with offset_ms <= cursor.
  let lo = 0;
  let hi = events.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].offset_ms <= cursorMs) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return last < 0 ? [] : events.slice(0, last + 1);
}
