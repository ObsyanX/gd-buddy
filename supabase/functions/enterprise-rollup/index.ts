// Track 7: Enterprise daily rollup. Aggregates yesterday's sessions per org
// into `enterprise_metrics_daily`. Idempotent via upsert on (org_id, day).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireRole } from "../_shared/auth-guard.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authRes = await requireRole(req, ["admin", "analyst"]);
    if (authRes instanceof Response) return authRes;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const dayParam = url.searchParams.get("day");
    const day = dayParam
      ? new Date(dayParam)
      : new Date(Date.now() - 24 * 3600 * 1000);
    const dayStr = day.toISOString().slice(0, 10);
    const dayStart = `${dayStr}T00:00:00Z`;
    const dayEnd = `${dayStr}T23:59:59Z`;

    const { data: orgs } = await supabase.from("organizations").select("id");
    const results: unknown[] = [];

    for (const org of orgs ?? []) {
      // Sessions belonging to this org's owner (simplified: org owner = session creator).
      const { data: owner } = await supabase
        .from("organizations")
        .select("owner_user_id")
        .eq("id", org.id)
        .single();
      if (!owner) continue;

      const { data: sessions } = await supabase
        .from("gd_sessions")
        .select("id")
        .eq("created_by", owner.owner_user_id)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const sessionIds = (sessions ?? []).map((s) => s.id);
      let participantCount = 0;
      let avgHealth: number | null = null;
      const radarSum: Record<string, number> = {};
      let radarN = 0;
      let tokens = 0;

      if (sessionIds.length) {
        const { count: pc } = await supabase
          .from("gd_participants")
          .select("*", { count: "exact", head: true })
          .in("session_id", sessionIds);
        participantCount = pc ?? 0;

        const { data: health } = await supabase
          .from("discussion_health")
          .select("score")
          .in("session_id", sessionIds);
        const hs = (health ?? []).map((h) => Number(h.score)).filter((n) => !isNaN(n));
        if (hs.length) avgHealth = hs.reduce((a, b) => a + b, 0) / hs.length;

        const { data: scores } = await supabase
          .from("session_scores")
          .select("clarity, relevance, engagement, evidence, teamwork, leadership")
          .in("session_id", sessionIds);
        for (const s of scores ?? []) {
          for (const k of ["clarity", "relevance", "engagement", "evidence", "teamwork", "leadership"]) {
            const v = Number((s as Record<string, unknown>)[k]);
            if (!isNaN(v)) radarSum[k] = (radarSum[k] ?? 0) + v;
          }
          radarN++;
        }

        const { data: tokRows } = await supabase
          .from("token_usage")
          .select("total_tokens")
          .in("session_id", sessionIds);
        tokens = (tokRows ?? []).reduce((a, t) => a + (Number(t.total_tokens) || 0), 0);
      }

      const avgRadar: Record<string, number> = {};
      if (radarN > 0) {
        for (const k of Object.keys(radarSum)) avgRadar[k] = radarSum[k] / radarN;
      }

      const { error: upErr } = await supabase.from("enterprise_metrics_daily").upsert(
        {
          org_id: org.id,
          day: dayStr,
          sessions_count: sessionIds.length,
          participants_count: participantCount,
          avg_health: avgHealth,
          avg_radar: avgRadar,
          tokens_used: tokens,
        },
        { onConflict: "org_id,day" },
      );
      if (upErr) results.push({ org_id: org.id, error: upErr.message });
      else results.push({ org_id: org.id, sessions: sessionIds.length });
    }

    // Do not echo per-org business metrics back to the caller. Return only a
    // count and the day processed; admins can read details from the table.
    return new Response(JSON.stringify({ day: dayStr, orgs_processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
