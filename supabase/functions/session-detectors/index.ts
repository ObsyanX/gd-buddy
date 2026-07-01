// Slice 4: Session Detectors
// Silence watchdog, topic-drift, escalation, consensus, abuse classifier.
// Invoked on a schedule OR ad-hoc from clients. Emits moderator_decisions rows
// so the conductor + UI can react (nudge speaker, redirect topic, cool down).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { callAI } from "../_shared/ai-with-fallback.ts";

const BodySchema = z.object({
  session_id: z.string().uuid(),
  mode: z.enum(["all", "silence", "drift", "escalation", "consensus", "abuse"]).default("all"),
});

const SILENCE_THRESHOLD_MS = 20_000; // 20s dead air = nudge
const ESCALATION_WORDS = /\b(shut up|stupid|idiot|nonsense|dumb|worst|hate)\b/i;
const ABUSE_WORDS = /\b(slur1|slur2|kill yourself|kys)\b/i; // extend as needed

type Decision = {
  kind: "silence" | "drift" | "escalation" | "consensus" | "abuse";
  rationale: string;
  action?: string;
  target_user?: string | null;
  score?: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { session_id, mode } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch session + last ~30 messages
  const { data: session } = await supabase
    .from("gd_sessions")
    .select("id,status,phase,topic,last_activity_at,mic_lock_holder,mic_lock_expires_at")
    .eq("id", session_id)
    .maybeSingle();

  if (!session) return json({ error: "session_not_found" }, 404);

  const { data: messages = [] } = await supabase
    .from("gd_messages")
    .select("id,user_id,participant_kind,content,end_ts,created_at")
    .eq("session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(30);

  const recent = (messages ?? []).slice().reverse();
  const decisions: Decision[] = [];

  const run = (m: typeof mode, kind: Decision["kind"]) => mode === "all" || mode === kind || mode === m;

  // --- 1. Silence watchdog -------------------------------------------------
  if (run("silence", "silence")) {
    const lastMsgAt = recent.length ? new Date(recent[recent.length - 1].created_at).getTime() : 0;
    const lastActivity = session.last_activity_at ? new Date(session.last_activity_at).getTime() : lastMsgAt;
    const idleMs = Date.now() - Math.max(lastMsgAt, lastActivity);
    if (session.status === "active" && session.phase === "discussion" && idleMs > SILENCE_THRESHOLD_MS) {
      decisions.push({
        kind: "silence",
        rationale: `No speech for ${Math.round(idleMs / 1000)}s`,
        action: "prompt_ai_participant",
        score: Math.min(1, idleMs / (60_000)),
      });
    }
  }

  // --- 2. Escalation / tone ------------------------------------------------
  if (run("escalation", "escalation")) {
    for (const m of recent.slice(-6)) {
      if (m?.content && ESCALATION_WORDS.test(m.content)) {
        decisions.push({
          kind: "escalation",
          rationale: `Heated language detected in recent turn`,
          action: "cool_down_prompt",
          target_user: m.user_id,
          score: 0.7,
        });
        break;
      }
    }
  }

  // --- 3. Abuse classifier -------------------------------------------------
  if (run("abuse", "abuse")) {
    for (const m of recent.slice(-10)) {
      if (m?.content && ABUSE_WORDS.test(m.content)) {
        decisions.push({
          kind: "abuse",
          rationale: `Policy-violating content detected`,
          action: "mute_and_flag",
          target_user: m.user_id,
          score: 1,
        });
      }
    }
  }

  // --- 4. Drift + consensus (LLM, only when we have enough content) --------
  if ((run("drift", "drift") || run("consensus", "consensus")) && recent.length >= 6 && session.topic) {
    const transcript = recent
      .map((m) => `- ${m.participant_kind}:${(m.content ?? "").slice(0, 200)}`)
      .join("\n");

    try {
      const ai = await callAI({
        system:
          "You audit a group discussion. Reply ONLY as compact JSON: " +
          `{"drift_score":0..1,"drift_reason":"","consensus_score":0..1,"consensus_summary":""}. ` +
          "drift_score=1 means fully off-topic; consensus_score=1 means participants agree on a shared conclusion.",
        user: `TOPIC: ${session.topic}\n\nTRANSCRIPT:\n${transcript}`,
        temperature: 0.2,
        maxTokens: 250,
        json: true,
      });
      const parsedAI = safeJson(ai.text);
      if (parsedAI) {
        if (run("drift", "drift") && typeof parsedAI.drift_score === "number" && parsedAI.drift_score > 0.6) {
          decisions.push({
            kind: "drift",
            rationale: parsedAI.drift_reason ?? "Discussion drifting off topic",
            action: "redirect_to_topic",
            score: parsedAI.drift_score,
          });
        }
        if (run("consensus", "consensus") && typeof parsedAI.consensus_score === "number" && parsedAI.consensus_score > 0.75) {
          decisions.push({
            kind: "consensus",
            rationale: parsedAI.consensus_summary ?? "Participants have converged",
            action: "propose_conclusion",
            score: parsedAI.consensus_score,
          });
        }
      }
    } catch (e) {
      console.warn("detector LLM failed", e);
    }
  }

  // Persist all decisions
  if (decisions.length) {
    await supabase.from("moderator_decisions").insert(
      decisions.map((d) => ({
        session_id,
        kind: d.kind,
        rationale: d.rationale,
        action: d.action ?? null,
        target_user: d.target_user ?? null,
        score: d.score ?? null,
        source: "session-detectors",
      })),
    );
  }

  return json({ ok: true, count: decisions.length, decisions });
});

function safeJson(text: string): any | null {
  try {
    const trimmed = text.trim().replace(/^```json?|```$/g, "").trim();
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
