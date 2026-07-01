/**
 * Track 9 Slice 2 — Human Override layer.
 *
 * Wraps the audit trail for any manual override of an AI moderation decision.
 * The UI calls `applyOverride()` from action buttons on `moderator_decisions`
 * rows; this both persists the audit row and applies the manual action via
 * the existing action-dispatcher edge function.
 */
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/governance/event-log";

export type ActorRole = "host" | "teacher" | "recruiter" | "admin" | "moderator";

export interface OverrideInput {
  sessionId: string;
  decisionId: string;
  actorRole: ActorRole;
  originalDecision: Record<string, unknown>;
  manualDecision: Record<string, unknown>;
  reason?: string;
}

export async function applyOverride(input: OverrideInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data: userRes } = await supabase.auth.getUser();
  const actorId = userRes?.user?.id ?? null;

  const { data, error } = await supabase
    .from("overrides")
    .insert({
      session_id: input.sessionId,
      actor_user_id: actorId,
      actor_role: input.actorRole,
      decision_id: input.decisionId,
      original_decision: input.originalDecision as never,
      manual_decision: input.manualDecision as never,
      reason: input.reason ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await logEvent({
    sessionId: input.sessionId,
    kind: "override.applied",
    payload: { decision_id: input.decisionId, actor_role: input.actorRole, reason: input.reason ?? null },
    actorUserId: actorId,
  });

  return { ok: true, id: data?.id };
}
