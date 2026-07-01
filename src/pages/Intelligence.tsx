import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLatencySnapshot, type LatencyBucket } from "@/lib/observability/latency-monitor";
import SEOHead from "@/components/SEOHead";

interface SessionSummary {
  id: string;
  topic: string | null;
  created_at: string;
  health: number | null;
  radar: Record<string, number> | null;
  policy_actions: number;
  fact_checks: number;
  fallacies: number;
  duplicates: number;
  contradictions: number;
  replay_events: number;
}

const RADAR_KEYS = [
  "clarity",
  "reasoning",
  "collaboration",
  "evidence",
  "emotional_intelligence",
  "leadership",
] as const;

async function loadLatestSummary(userId: string): Promise<SessionSummary | null> {
  const sessRes = await supabase
    .from("gd_sessions")
    .select("id, topic, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sess = sessRes.data as { id: string; topic: string | null; created_at: string } | null;
  if (!sess) return null;

  const sid = sess.id;
  const countHead = { count: "exact" as const, head: true };

  const healthRow = await supabase
    .from("discussion_health")
    .select("overall_health")
    .eq("session_id", sid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scoresRow = await supabase
    .from("session_scores")
    .select("clarity, reasoning, collaboration, evidence, emotional_intelligence, leadership")
    .eq("session_id", sid)
    .maybeSingle();

  const decisions = await supabase.from("moderator_decisions").select("*", countHead).eq("session_id", sid);
  const facts = await supabase.from("fact_checks").select("*", countHead).eq("session_id", sid);
  const fallacies = await supabase.from("fallacies").select("*", countHead).eq("session_id", sid);
  const dups = await supabase.from("duplicate_ideas").select("*", countHead).eq("session_id", sid);
  const contras = await supabase.from("contradictions").select("*", countHead).eq("session_id", sid);
  const replay = await supabase.from("session_replays").select("event_count").eq("session_id", sid).maybeSingle();

  const health = healthRow.data ? Number((healthRow.data as { overall_health: number }).overall_health) : null;
  let radar: Record<string, number> | null = null;
  if (scoresRow.data) {
    radar = {};
    for (const k of RADAR_KEYS) {
      const v = (scoresRow.data as Record<string, unknown>)[k];
      if (typeof v === "number") radar[k] = v;
    }
  }

  return {
    id: sess.id,
    topic: sess.topic,
    created_at: sess.created_at,
    health,
    radar,
    policy_actions: decisions.count ?? 0,
    fact_checks: facts.count ?? 0,
    fallacies: fallacies.count ?? 0,
    duplicates: dups.count ?? 0,
    contradictions: contras.count ?? 0,
    replay_events: ((replay.data as { event_count?: number } | null)?.event_count) ?? 0,
  };
}

export default function Intelligence() {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [latency, setLatency] = useState<LatencyBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [s, l] = await Promise.all([
          loadLatestSummary(user.id),
          fetchLatencySnapshot(60).catch(() => [] as LatencyBucket[]),
        ]);
        setSummary(s);
        setLatency(l);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <SEOHead title="Discussion Intelligence" description="Unified GD Buddy intelligence dashboard." />
      <div>
        <h1 className="text-3xl font-bold">Discussion Intelligence</h1>
        <p className="text-muted-foreground text-sm">
          Unified view: reasoning, moderation, memory, scoring, replay, and platform latency.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !summary ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          No sessions yet. Start a discussion to see intelligence signals here.
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Latest session</CardTitle>
              <p className="text-sm text-muted-foreground">
                {summary.topic ?? "(untitled)"} — {new Date(summary.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Health" value={summary.health != null ? summary.health.toFixed(2) : "—"} />
              <Stat label="Policy actions" value={summary.policy_actions} />
              <Stat label="Fact checks" value={summary.fact_checks} />
              <Stat label="Fallacies" value={summary.fallacies} />
              <Stat label="Duplicate ideas" value={summary.duplicates} />
              <Stat label="Contradictions" value={summary.contradictions} />
              <Stat label="Replay events" value={summary.replay_events} />
              <Stat label="Session id" value={summary.id.slice(0, 8) + "…"} />
            </CardContent>
          </Card>

          {summary.radar && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Radar (6-axis)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {RADAR_KEYS.map((k) => (
                  <Stat
                    key={k}
                    label={k.replace(/_/g, " ")}
                    value={summary.radar?.[k] != null ? Number(summary.radar[k]).toFixed(2) : "—"}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform latency (last 60 min)</CardTitle>
          <p className="text-sm text-muted-foreground">
            p50/p95/p99 per operation, sourced from perf_events.
          </p>
        </CardHeader>
        <CardContent>
          {latency.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent perf events.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Operation</th>
                    <th className="text-right py-2 pr-4">Count</th>
                    <th className="text-right py-2 pr-4">p50 (ms)</th>
                    <th className="text-right py-2 pr-4">p95 (ms)</th>
                    <th className="text-right py-2 pr-4">p99 (ms)</th>
                    <th className="text-right py-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {latency.slice(0, 25).map((b) => (
                    <tr key={b.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{b.name}</td>
                      <td className="text-right pr-4">{b.count}</td>
                      <td className="text-right pr-4">{b.p50_ms}</td>
                      <td className="text-right pr-4">{b.p95_ms}</td>
                      <td className="text-right pr-4">{b.p99_ms}</td>
                      <td className="text-right">
                        <Badge variant={b.error_rate > 0.05 ? "destructive" : "secondary"}>
                          {(b.error_rate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
