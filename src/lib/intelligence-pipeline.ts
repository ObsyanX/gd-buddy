// Track 2 — Client orchestrator. Runs the Reasoning → Policy → Dispatch
// pipeline for one detector snapshot. Fire-and-forget; safe to call from
// polling loops.
import { supabase } from "@/integrations/supabase/client";
import type { SessionState } from "@/lib/policy-engine";

interface Signal {
  kind: string;
  [k: string]: unknown;
}

export async function runIntelligencePipeline(
  session_id: string,
  state: SessionState,
  signals: Signal[],
) {
  const { data: r } = await supabase.functions.invoke("reasoning-agent", {
    body: { session_id, state, signals },
  });
  const interventions = (r as { interventions?: unknown[] })?.interventions ?? [];

  const applied: Array<{ id: string; action: string; matched_rule: string }> = [];

  for (const candidate of interventions as Array<{
    action: string;
    confidence: number;
    target_user_id?: string;
    reasoning: string;
    evidence: Record<string, unknown>;
    alternatives: Array<{ action: string; reasoning: string }>;
  }>) {
    const { data: p } = await supabase.functions.invoke("policy-engine", {
      body: { session_id, state, candidate },
    });
    const decision = (p as { allowed?: boolean; decision?: { action: string; matched_rule: string; confidence: number } })?.decision;
    if (!decision) continue;

    const { data: d } = await supabase.functions.invoke("action-dispatcher", {
      body: { session_id, decision, candidate },
    });
    const id = (d as { id?: string })?.id;
    if (id) applied.push({ id, action: decision.action, matched_rule: decision.matched_rule });
  }
  return { applied };
}
