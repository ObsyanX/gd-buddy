// session-phase edge function — Slice 3 of the edge-case hardening plan.
//
// Drives the intro / discussion / conclusion phase machine server-side so
// behavior is deterministic across clients and survives reconnects.
//
// Endpoints (POST body = { session_id, event, payload? }):
//   event = "start"             -> lobby -> intro, broadcast intro prompt
//   event = "intro_taken"       -> mark human volunteer, cancel AI intro
//   event = "intro_timeout"     -> no volunteer after 10s -> AI intros
//   event = "intro_done"        -> intro -> discussion
//   event = "timer_low"         -> discussion -> conclusion, broadcast final-remarks prompt
//   event = "host_conclude"     -> host-forced conclusion
//   event = "conclusion_done"   -> conclusion -> ended
//   event = "extend"            -> one-time +2min extension from conclusion
//
// All transitions are validated against the current phase in the DB so a
// stale client cannot skip phases. The function logs every decision to
// public.moderator_decisions for explainability (Q76-Q78).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI } from "../_shared/ai-with-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Phase = "lobby" | "intro" | "discussion" | "conclusion" | "ended";
type Event =
  | "start"
  | "intro_taken"
  | "intro_timeout"
  | "intro_done"
  | "timer_low"
  | "host_conclude"
  | "conclusion_done"
  | "extend";

const NEXT: Record<Phase, Partial<Record<Event, Phase>>> = {
  lobby: { start: "intro" },
  intro: { intro_done: "discussion", intro_taken: "intro", intro_timeout: "intro" },
  discussion: { timer_low: "conclusion", host_conclude: "conclusion" },
  conclusion: { conclusion_done: "ended", extend: "discussion" },
  ended: {},
};

async function logDecision(
  db: ReturnType<typeof createClient>,
  session_id: string,
  action: string,
  reason: string,
  evidence: unknown = [],
  confidence = 0.95,
) {
  const { error } = await db.from("moderator_decisions").insert({
    session_id,
    action,
    reason,
    confidence,
    evidence,
  });
  if (error) console.error("session-phase moderator_decisions insert error", error);
}

async function broadcastSystemMessage(
  db: ReturnType<typeof createClient>,
  session_id: string,
  content: string,
  _kind: string,
) {
  // gd_messages requires a participant_id — find or create a Moderator participant for this session.
  let moderatorId: string | null = null;
  const { data: existing, error: existErr } = await db
    .from("gd_participants")
    .select("id")
    .eq("session_id", session_id)
    .eq("persona_name", "Moderator")
    .maybeSingle();
  if (existErr) console.error("session-phase find moderator error", existErr);
  if (existing?.id) {
    moderatorId = existing.id;
  } else {
    const { data: maxOrder, error: maxErr } = await db
      .from("gd_participants")
      .select("order_index")
      .eq("session_id", session_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) console.error("session-phase max order error", maxErr);
    const nextOrder = ((maxOrder as any)?.order_index ?? -1) + 1;
    const { data: created, error: createErr } = await db
      .from("gd_participants")
      .insert({
        session_id,
        is_user: false,
        order_index: nextOrder,
        persona_name: "Moderator",
        persona_role: "moderator",
      })
      .select("id")
      .maybeSingle();
    if (createErr) console.error("session-phase create moderator error", createErr);
    moderatorId = (created as any)?.id ?? null;
  }
  if (!moderatorId) return;
  const { error: msgErr } = await db.from("gd_messages").insert({
    session_id,
    participant_id: moderatorId,
    text: content,
  });
  if (msgErr) console.error("session-phase gd_messages insert error", msgErr);
}

async function generateAIIntro(topic: string): Promise<string> {
  try {
    const res = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are the moderator of a group discussion. Deliver a crisp 3-4 sentence introduction: state the topic, note the ground rules (listen, one speaker at a time, keep it constructive), then pose one icebreaker question. Under 90 words.",
        },
        { role: "user", content: `Topic: ${topic}` },
      ],
      temperature: 0.7,
      max_tokens: 220,
    });
    return res.choices?.[0]?.message?.content ??
      `Welcome, everyone. Today's topic is: ${topic}. Please speak one at a time and keep the discussion constructive. To open — what is the first angle that comes to mind?`;
  } catch {
    return `Welcome, everyone. Today's topic is: ${topic}. Please speak one at a time. To open — what is the first angle that comes to mind?`;
  }
}

async function generateAIConclusion(
  db: ReturnType<typeof createClient>,
  session_id: string,
  topic: string,
): Promise<string> {
  const { data: msgs } = await db
    .from("gd_messages")
    .select("text, gd_participants(persona_name)")
    .eq("session_id", session_id)
    .order("start_ts", { ascending: false })
    .limit(20);
  const transcript = (msgs ?? [])
    .reverse()
    .map((m: any) => `${m?.gd_participants?.persona_name ?? "Speaker"}: ${m.text ?? ""}`)
    .join("\n")
    .slice(0, 3500);
  try {
    const res = await callAI({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a neutral moderator concluding a group discussion. Summarize the main viewpoints raised (attribute by speaker name), explicitly note where consensus was and was not reached, and close with one sentence about the strongest argument overall. Under 130 words.",
        },
        { role: "user", content: `Topic: ${topic}\n\nRecent discussion:\n${transcript}` },
      ],
      temperature: 0.5,
      max_tokens: 260,
    });
    return res.choices?.[0]?.message?.content ??
      `Thank you all. The discussion on "${topic}" covered several angles. Where views diverged, the disagreement is noted rather than forced into consensus.`;
  } catch {
    return `Thank you all. The discussion on "${topic}" is now closed.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = await req.json();
    const session_id: string = body.session_id;
    const event: Event = body.event;

    if (!session_id || !event) {
      return new Response(JSON.stringify({ error: "session_id and event required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sErr } = await supabase
      .from("gd_sessions")
      .select("id, phase, topic, extension_used, host_user_id, user_id")
      .eq("id", session_id)
      .maybeSingle();

    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const current = (session.phase ?? "lobby") as Phase;
    const target = NEXT[current]?.[event];

    // "extend" from conclusion is only allowed once; column may not exist yet
    if (event === "extend" && session.extension_used) {
      return new Response(JSON.stringify({ status: "extension_denied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target) {
      await logDecision(
        supabase,
        session_id,
        `phase_event_ignored:${event}`,
        `Event not valid in phase ${current}`,
        [],
        0.99,
      );
      return new Response(JSON.stringify({ status: "ignored", phase: current }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply phase transition
    const updates: Record<string, unknown> = { phase: target, last_activity_at: new Date().toISOString() };
    if (event === "extend") updates.extension_used = true;
    if (target === "ended") updates.end_time = new Date().toISOString();

    const { error: updErr } = await supabase.from("gd_sessions").update(updates).eq("id", session_id);
    if (updErr) console.error("session-phase gd_sessions update error", updErr);
    await logDecision(supabase, session_id, `phase:${current}->${target}`, `event=${event}`);

    // Phase-entry side effects
    if (target === "intro" && event === "start") {
      await broadcastSystemMessage(
        supabase,
        session_id,
        "The discussion is starting. Who would like to introduce the topic? Press the mic within 10 seconds to volunteer.",
        "intro_prompt",
      );
    }

    if (current === "intro" && event === "intro_timeout") {
      const intro = await generateAIIntro(session.topic ?? "the topic");
      await broadcastSystemMessage(supabase, session_id, intro, "ai_intro");
      await logDecision(
        supabase,
        session_id,
        "ai_intro_delivered",
        "No human volunteered within 10s",
        [],
        0.9,
      );
    }

    if (target === "conclusion") {
      await broadcastSystemMessage(
        supabase,
        session_id,
        "We're moving into the conclusion. Does anyone have any final remarks? Press the mic to conclude.",
        "conclusion_prompt",
      );
    }

    if (target === "ended" && event === "conclusion_done") {
      const summary = await generateAIConclusion(supabase, session_id, session.topic ?? "the topic");
      await broadcastSystemMessage(supabase, session_id, summary, "ai_conclusion");
    }

    return new Response(
      JSON.stringify({ status: "ok", phase: target }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[session-phase] error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
