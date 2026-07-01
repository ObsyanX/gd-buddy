/**
 * Track 9.11 — Event Sourcing.
 *
 * Small append-only helper for recording session lifecycle events into
 * `event_log`. Never throws — event logging must never break a live session.
 * Consumers can replay by ordering by (session_id, seq).
 */
import { supabase } from "@/integrations/supabase/client";

export type EventKind =
  | "participant.joined"
  | "participant.left"
  | "mic.granted"
  | "mic.released"
  | "speaking.started"
  | "speaking.ended"
  | "moderator.intervention"
  | "policy.triggered"
  | "graph.updated"
  | "fact.verified"
  | "report.generated"
  | "override.applied"
  | "safety.blocked"
  | "phase.changed";

export interface LogEventInput {
  sessionId: string | null;
  kind: EventKind;
  payload?: Record<string, unknown>;
  actorUserId?: string | null;
}

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    await supabase.from("event_log").insert({
      session_id: input.sessionId,
      kind: input.kind,
      payload: input.payload ?? {},
      actor_user_id: input.actorUserId ?? null,
    });
  } catch {
    // swallow — telemetry must never break real-time flows
  }
}

export async function fetchSessionEvents(sessionId: string, limit = 500) {
  const { data, error } = await supabase
    .from("event_log")
    .select("id, seq, kind, payload, actor_user_id, created_at")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}
