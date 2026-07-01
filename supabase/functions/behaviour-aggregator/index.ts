// Track 3 — Behaviour aggregator.
// Reads recent speaking_turns, gd_messages and emotion_events, computes rolled
// metrics per participant and a session-level discussion_health row.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  session_id: z.string().uuid(),
});

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
const clamp01 = (n: number) => clamp(n, 0, 1);

function gini(values: number[]): number {
  const v = values.filter((n) => Number.isFinite(n) && n >= 0);
  if (v.length === 0) return 0;
  const sum = v.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const sorted = [...v].sort((a, b) => a - b);
  const n = sorted.length;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i];
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { session_id } = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: session } = await supabase
      .from("gd_sessions")
      .select("id, start_time, created_at")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) return json({ error: "session_not_found" }, 404);

    const sessionStart = new Date(session.start_time ?? session.created_at).getTime();
    const sessionAgeMs = Math.max(1, Date.now() - sessionStart);

    const [{ data: participants }, { data: turns }, { data: emotions }] = await Promise.all([
      supabase.from("gd_participants").select("id, real_user_id, kind").eq("session_id", session_id),
      supabase
        .from("speaking_turns")
        .select("id, user_id, granted_at, released_at, duration_ms, status")
        .eq("session_id", session_id),
      supabase
        .from("emotion_events")
        .select("participant_id, valence, confidence, arousal, label, created_at")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const parts = participants ?? [];
    const turnRows = turns ?? [];
    const emoRows = emotions ?? [];

    // Aggregate per-participant.
    type Agg = {
      participantId: string;
      talkTimeMs: number;
      turnCount: number;
      interruptionCount: number;
      lastSpokeAt: string | null;
      sentiments: number[];
      lastEmotion: string | null;
    };
    const byParticipant = new Map<string, Agg>();
    for (const p of parts) {
      byParticipant.set(p.id, {
        participantId: p.id,
        talkTimeMs: 0,
        turnCount: 0,
        interruptionCount: 0,
        lastSpokeAt: null,
        sentiments: [],
        lastEmotion: null,
      });
    }

    // Match turns to participants by user_id → participant.real_user_id.
    const userIdToParticipantId = new Map<string, string>();
    for (const p of parts) if (p.real_user_id) userIdToParticipantId.set(p.real_user_id, p.id);

    for (const t of turnRows) {
      const pid = t.user_id ? userIdToParticipantId.get(t.user_id) : undefined;
      if (!pid) continue;
      const agg = byParticipant.get(pid);
      if (!agg) continue;
      agg.turnCount += 1;
      const dur = t.duration_ms
        ? Number(t.duration_ms)
        : t.granted_at && t.released_at
          ? Math.max(0, new Date(t.released_at).getTime() - new Date(t.granted_at).getTime())
          : 0;
      agg.talkTimeMs += dur;
      if (t.released_at) {
        if (!agg.lastSpokeAt || new Date(t.released_at) > new Date(agg.lastSpokeAt)) {
          agg.lastSpokeAt = t.released_at;
        }
      }
    }

    // Interruption count via consecutive turn overlap heuristic (Slice 5 attribution).
    const sortedTurns = [...turnRows]
      .filter((t) => t.granted_at)
      .sort((a, b) => new Date(a.granted_at!).getTime() - new Date(b.granted_at!).getTime());
    for (let i = 1; i < sortedTurns.length; i++) {
      const prev = sortedTurns[i - 1];
      const cur = sortedTurns[i];
      if (!prev.released_at || !cur.granted_at) continue;
      if (new Date(cur.granted_at).getTime() < new Date(prev.released_at).getTime() - 200) {
        const pid = cur.user_id ? userIdToParticipantId.get(cur.user_id) : undefined;
        if (pid) {
          const agg = byParticipant.get(pid);
          if (agg) agg.interruptionCount += 1;
        }
      }
    }

    // Emotions per participant (most recent 20).
    for (const e of emoRows) {
      if (!e.participant_id) continue;
      const agg = byParticipant.get(e.participant_id);
      if (!agg) continue;
      if (agg.sentiments.length < 20) agg.sentiments.push(Number(e.valence) || 0);
      if (!agg.lastEmotion && e.label) agg.lastEmotion = e.label as string;
    }

    const totalTalk = Array.from(byParticipant.values()).reduce((a, b) => a + b.talkTimeMs, 0);
    const participantCount = Math.max(1, byParticipant.size);

    const behaviourUpserts = Array.from(byParticipant.values()).map((agg) => {
      const share = totalTalk > 0 ? agg.talkTimeMs / totalTalk : 0;
      const fairShare = 1 / participantCount;
      const dominance = clamp01(Math.max(0, share - fairShare) / Math.max(1e-6, 1 - fairShare));
      const rate = agg.turnCount / (sessionAgeMs / 60_000);
      const rateScore = clamp01(rate / 3);
      const talkScore = clamp01(agg.talkTimeMs / Math.max(1, sessionAgeMs * 0.25));
      const disrupt = clamp01(agg.interruptionCount / 10);
      const engagement = clamp01(0.6 * rateScore + 0.4 * talkScore - 0.3 * disrupt);
      const sentimentAvg = agg.sentiments.length
        ? agg.sentiments.reduce((a, b) => a + b, 0) / agg.sentiments.length
        : 0;
      const half = Math.ceil(agg.sentiments.length / 2);
      const recent = agg.sentiments.slice(0, half);
      const older = agg.sentiments.slice(half);
      const sentimentTrend =
        recent.length && older.length
          ? recent.reduce((a, b) => a + b, 0) / recent.length -
            older.reduce((a, b) => a + b, 0) / older.length
          : 0;
      return {
        session_id,
        participant_id: agg.participantId,
        talk_time_ms: Math.round(agg.talkTimeMs),
        turn_count: agg.turnCount,
        interruption_count: agg.interruptionCount,
        avg_turn_ms: agg.turnCount ? Math.round(agg.talkTimeMs / agg.turnCount) : 0,
        dominance_score: Number(dominance.toFixed(3)),
        engagement_score: Number(engagement.toFixed(3)),
        sentiment_avg: Number(clamp(sentimentAvg, -1, 1).toFixed(3)),
        sentiment_trend: Number(clamp(sentimentTrend, -1, 1).toFixed(3)),
        emotion_label: agg.lastEmotion,
        last_spoke_at: agg.lastSpokeAt,
      };
    });

    if (behaviourUpserts.length > 0) {
      const { error: upErr } = await supabase
        .from("participant_behaviour")
        .upsert(behaviourUpserts, { onConflict: "session_id,participant_id" });
      if (upErr) console.error("[behaviour-aggregator] upsert error", upErr);
    }

    // Session health rollup.
    const shares = Array.from(byParticipant.values()).map((b) => b.talkTimeMs);
    const totalInterrupts = Array.from(byParticipant.values()).reduce((a, b) => a + b.interruptionCount, 0);
    const participationGini = gini(shares);
    const interruptionRate = totalInterrupts / (sessionAgeMs / 60_000);
    const sentimentIndex = emoRows.length
      ? emoRows.slice(0, 40).reduce((a, e) => a + (Number(e.valence) || 0), 0) / Math.min(40, emoRows.length)
      : 0;
    const arousalMean = emoRows.length
      ? emoRows.slice(0, 40).reduce((a, e) => a + (Number(e.arousal) || 0), 0) / Math.min(40, emoRows.length)
      : 0;
    const energy = clamp01(0.5 * arousalMean + 0.5 * clamp01(totalTalk / Math.max(1, sessionAgeMs * 0.5)));
    const topicFocus = 0.6; // Placeholder: real drift score plugged in by session-detectors Slice 4.

    const fair = 1 - clamp01(participationGini);
    const civil = 1 - clamp01(interruptionRate / 6);
    const mood = (clamp(sentimentIndex, -1, 1) + 1) / 2;
    const overall = Math.round(
      clamp01(0.28 * fair + 0.22 * civil + 0.18 * mood + 0.2 * topicFocus + 0.12 * energy) * 100,
    );

    const { error: hErr } = await supabase
      .from("discussion_health")
      .upsert(
        {
          session_id,
          participation_gini: Number(participationGini.toFixed(3)),
          interruption_rate: Number(interruptionRate.toFixed(3)),
          sentiment_index: Number(sentimentIndex.toFixed(3)),
          topic_focus: Number(topicFocus.toFixed(3)),
          energy: Number(energy.toFixed(3)),
          overall_health: overall,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" },
      );
    if (hErr) console.error("[behaviour-aggregator] health upsert error", hErr);

    return json({
      ok: true,
      participants: behaviourUpserts.length,
      overall_health: overall,
      signal: {
        kind: "behaviour_snapshot",
        session_id,
        participation_gini: participationGini,
        interruption_rate: interruptionRate,
        overall_health: overall,
      },
    });
  } catch (err) {
    console.error("[behaviour-aggregator] error", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
