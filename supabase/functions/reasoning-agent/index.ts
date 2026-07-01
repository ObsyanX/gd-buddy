// Track 2 — Reasoning Agent
//
// Consumes a session state snapshot + detector signals and returns a set of
// candidate Interventions (what happened, why, what to do, alternatives,
// confidence, evidence). It does NOT act — the Policy Engine validates and
// the Action Dispatcher applies.
//
// POST body: { session_id, state, signals }
// Response:  { interventions: Intervention[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAI } from "../_shared/ai-with-fallback.ts";

interface Intervention {
  action: string;
  target_user_id?: string | null;
  reasoning: string;
  evidence: Record<string, unknown>;
  confidence: number;
  alternatives: Array<{ action: string; reasoning: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id, state, signals } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const system = `You are the Reasoning Agent for a group discussion platform.
You are given a session state snapshot and detector signals.
Return a JSON object: {"interventions":[{action, target_user_id?, reasoning, evidence, confidence, alternatives:[{action,reasoning}]}]}
Allowed actions: wait, engage_prompt, warn_interruption, invite_quiet, redirect, suggest_only, recommend_conclusion, followup_prompt, terminate_insufficient_participation, polite_duplicate_nudge, note_evolution.
Never invent actions. Return an empty list if no intervention is warranted.
Confidence is 0..1. Include the specific state keys you used as evidence.`;

    const prompt = JSON.stringify({ state, signals }, null, 2);

    let interventions: Intervention[] = [];
    try {
      const ai = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const raw = ai.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      interventions = Array.isArray(parsed.interventions) ? parsed.interventions : [];
    } catch (e) {
      console.error("reasoning-agent AI error", e);
    }

    // Persist a lightweight trace for observability. The dispatcher will
    // write the full explainability record after the policy engine decides.
    await supabase.from("perf_events").insert([
      {
        session_id,
        name: "reasoning_agent",
        duration_ms: 0,
        ok: true,
        metadata: { interventions: interventions.length },
      },
    ]);

    return new Response(JSON.stringify({ interventions }), {
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
