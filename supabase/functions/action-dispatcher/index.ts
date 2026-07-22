// Track 2 — Action Dispatcher
//
// Applies an approved policy decision:
//   - Writes a full explainability record to `moderator_decisions`
//     (action, matched_rule, reasoning_trace, alternatives, chosen_because,
//      confidence, target_user_id, evidence).
//   - Emits a realtime event via a NOTIFY-style row so clients can react.
//   - Returns the persisted decision id.
//
// POST body:
//   { session_id, decision, candidate }
// where `decision` is the Policy Engine output and `candidate` is the
// original Reasoning-Agent Intervention.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireSessionAccess } from "../_shared/auth-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id, decision, candidate } = await req.json();
    if (!session_id || !decision || !candidate) {
      return new Response(JSON.stringify({ error: "session_id, decision, candidate required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authOrResp = await requireSessionAccess(req, session_id);
    if (authOrResp instanceof Response) return authOrResp;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("moderator_decisions")
      .insert([
        {
          session_id,
          action: decision.action,
          target_user_id: candidate.target_user_id ?? null,
          reason: candidate.reasoning ?? decision.matched_rule,
          confidence: decision.confidence ?? candidate.confidence ?? 0.5,
          evidence: candidate.evidence ?? {},
          applied: true,
          matched_rule: decision.matched_rule,
          reasoning_trace: {
            candidate_reasoning: candidate.reasoning,
            matched_rule: decision.matched_rule,
            params: decision.params ?? {},
          },
          alternatives: candidate.alternatives ?? [],
          chosen_because:
            `Rule '${decision.matched_rule}' matched at confidence ${decision.confidence}.`,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data?.id, applied: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
