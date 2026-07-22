// Track 2 — Policy Engine edge function
//
// Loads global + org + session moderation_policies rows and evaluates them
// against a state snapshot for a single candidate Intervention. Purely a
// validator — no reasoning, no AI calls.
//
// POST body: { session_id, state, candidate: { action, confidence, target_user_id?, reasoning, evidence, alternatives } }
// Response:  { allowed: boolean, decision?: PolicyDecision, reason?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireSessionAccess } from "../_shared/auth-guard.ts";

interface Rule {
  rule_id: string;
  priority: number;
  when_expr: Record<string, unknown>;
  then_action: { action: string; params?: Record<string, unknown> };
  confidence_floor: number;
  enabled: boolean;
}

function matches(value: unknown, pred: unknown): boolean {
  if (pred === null || pred === undefined) return false;
  if (typeof pred !== "object") return value === pred;
  const p = pred as Record<string, unknown>;
  if ("==" in p) return value === p["=="];
  if ("!=" in p) return value !== p["!="];
  if (typeof value !== "number") return false;
  if (">" in p && !(value > (p[">"] as number))) return false;
  if ("<" in p && !(value < (p["<"] as number))) return false;
  if (">=" in p && !(value >= (p[">="] as number))) return false;
  if ("<=" in p && !(value <= (p["<="] as number))) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id, state, candidate } = await req.json();
    if (!session_id || !candidate) {
      return new Response(JSON.stringify({ error: "session_id and candidate required" }), {
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

    // Load session's org for scope filtering
    const { data: sess } = await supabase
      .from("gd_sessions")
      .select("id, org_id")
      .eq("id", session_id)
      .maybeSingle();

    const { data: rules } = await supabase
      .from("moderation_policies")
      .select("*")
      .or(
        `scope.eq.global,and(scope.eq.session,session_id.eq.${session_id})${
          sess?.org_id ? `,and(scope.eq.org,org_id.eq.${sess.org_id})` : ""
        }`,
      )
      .order("priority", { ascending: true });

    const active: Rule[] = (rules ?? []).filter((r: Rule) => r.enabled !== false);

    for (const r of active) {
      if (candidate.confidence < r.confidence_floor) continue;
      if (r.then_action.action !== candidate.action) continue;
      const allMatch = Object.entries(r.when_expr).every(([k, pred]) =>
        matches(state?.[k], pred),
      );
      if (allMatch) {
        return new Response(
          JSON.stringify({
            allowed: true,
            decision: {
              action: r.then_action.action,
              params: r.then_action.params ?? {},
              matched_rule: r.rule_id,
              confidence: candidate.confidence,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ allowed: false, reason: "no_matching_rule" }), {
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
