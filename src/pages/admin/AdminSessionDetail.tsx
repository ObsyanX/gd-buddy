import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Bot, Download, Printer } from "lucide-react";

interface Session {
  id: string;
  topic: string;
  topic_category: string | null;
  topic_difficulty: string | null;
  status: string;
  is_multiplayer: boolean | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  user_id: string | null;
  host_user_id: string | null;
  termination_reason: string | null;
  phase: string;
}

interface Participant {
  id: string;
  session_id: string;
  is_user: boolean;
  order_index: number;
  persona_name: string;
  persona_role: string | null;
  real_user_id: string | null;
  display_name?: string | null;
  message_count?: number;
  words?: number;
  interruptions?: number;
  avg_overlap?: number;
  score?: {
    overall: number; clarity: number; reasoning: number; collaboration: number;
    evidence: number; emotional_intelligence: number; leadership: number;
  } | null;
}

interface MetricsRow {
  fluency_score: number | null;
  content_score: number | null;
  structure_score: number | null;
  voice_score: number | null;
  filler_count: number | null;
  words_per_min: number | null;
  total_words: number | null;
  sentiment_score: number | null;
  leadership_score: number | null;
  teamwork_score: number | null;
  posture_score: number | null;
  eye_contact_score: number | null;
  expression_score: number | null;
}

function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function AdminSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [metrics, setMetrics] = useState<MetricsRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    async function load() {
      setLoading(true);
      const [sRes, pRes, mRes, msgRes, scoreRes] = await Promise.all([
        supabase.from("gd_sessions").select("*").eq("id", id!).maybeSingle(),
        supabase.from("gd_participants").select("id, session_id, is_user, order_index, persona_name, persona_role, real_user_id").eq("session_id", id!).order("order_index"),
        supabase.from("gd_metrics").select("*").eq("session_id", id!).maybeSingle(),
        supabase.from("gd_messages").select("participant_id, text, interruption, overlap_seconds").eq("session_id", id!),
        supabase.from("session_scores").select("*").eq("session_id", id!),
      ]);
      if (cancel) return;
      setSession((sRes.data as Session) ?? null);
      setMetrics((mRes.data as MetricsRow) ?? null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partsList = ((pRes.data as any[]) ?? []) as Participant[];
      const realIds = partsList.map((p) => p.real_user_id).filter(Boolean) as string[];
      const { data: profs } = realIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", realIds)
        : { data: [] as { id: string; display_name: string | null }[] };
      const nameMap = new Map<string, string | null>();
      (profs ?? []).forEach((p: { id: string; display_name: string | null }) => nameMap.set(p.id, p.display_name));
      const msgByPart = new Map<string, { count: number; words: number; interruptions: number; overlap: number; overlapN: number }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((msgRes.data as any[]) ?? []).forEach((m) => {
        const cur = msgByPart.get(m.participant_id) ?? { count: 0, words: 0, interruptions: 0, overlap: 0, overlapN: 0 };
        cur.count += 1;
        cur.words += (m.text ?? "").split(/\s+/).filter(Boolean).length;
        if (m.interruption) cur.interruptions += 1;
        if (m.overlap_seconds != null) { cur.overlap += Number(m.overlap_seconds); cur.overlapN += 1; }
        msgByPart.set(m.participant_id, cur);
      });
      const scoreByUser = new Map<string, Participant["score"]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((scoreRes.data as any[]) ?? []).forEach((s) => scoreByUser.set(s.user_id, {
        overall: s.overall, clarity: s.clarity, reasoning: s.reasoning, collaboration: s.collaboration,
        evidence: s.evidence, emotional_intelligence: s.emotional_intelligence, leadership: s.leadership,
      }));
      setParts(partsList.map((p) => {
        const m = msgByPart.get(p.id);
        return {
          ...p,
          display_name: p.real_user_id ? (nameMap.get(p.real_user_id) ?? null) : null,
          message_count: m?.count ?? 0,
          words: m?.words ?? 0,
          interruptions: m?.interruptions ?? 0,
          avg_overlap: m && m.overlapN ? m.overlap / m.overlapN : 0,
          score: p.real_user_id ? scoreByUser.get(p.real_user_id) ?? null : null,
        };
      }));
      setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading session…</p>;
  if (!session) return <p className="text-sm text-muted-foreground">Session not found.</p>;

  const humans = parts.filter((p) => p.is_user || p.real_user_id);
  const ais = parts.filter((p) => !p.is_user && !p.real_user_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/home/admin/sessions"><ArrowLeft className="h-4 w-4 mr-1" />All sessions</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{session.topic}</h1>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
          {session.topic_category && <Badge variant="secondary">{session.topic_category}</Badge>}
          {session.topic_difficulty && <Badge variant="outline">{session.topic_difficulty}</Badge>}
          <Badge variant={session.status === "completed" ? "default" : "secondary"}>{session.status}</Badge>
          <Badge variant="outline">{session.is_multiplayer ? "Multiplayer" : "Solo"}</Badge>
          <span>· phase {session.phase}</span>
          <span>· created {new Date(session.created_at).toLocaleString()}</span>
          <span>· duration {fmtDuration(session.start_time, session.end_time)}</span>
        </div>
      </div>

      {metrics && (
        <Card><CardContent className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">AI feedback (session-level)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <Metric label="Fluency" value={metrics.fluency_score} />
            <Metric label="Content" value={metrics.content_score} />
            <Metric label="Structure" value={metrics.structure_score} />
            <Metric label="Voice" value={metrics.voice_score} />
            <Metric label="WPM" value={metrics.words_per_min} />
            <Metric label="Filler count" value={metrics.filler_count} />
            <Metric label="Total words" value={metrics.total_words} />
            <Metric label="Sentiment" value={metrics.sentiment_score} />
            <Metric label="Leadership" value={metrics.leadership_score} />
            <Metric label="Teamwork" value={metrics.teamwork_score} />
            <Metric label="Posture" value={metrics.posture_score} />
            <Metric label="Eye contact" value={metrics.eye_contact_score} />
            <Metric label="Expression" value={metrics.expression_score} />
          </div>
        </CardContent></Card>
      )}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Human participants ({humans.length})
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {humans.map((p) => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{p.display_name ?? p.persona_name}</span>
                  </div>
                  {p.persona_role && <div className="text-xs text-muted-foreground">{p.persona_role}</div>}
                  {p.real_user_id && (
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.real_user_id.slice(0, 8)}</div>
                  )}
                </div>
                {p.score && (
                  <div className="text-right">
                    <div className="text-2xl font-semibold leading-none">{p.score.overall.toFixed(1)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <Stat label="Messages" value={String(p.message_count ?? 0)} />
                <Stat label="Words" value={String(p.words ?? 0)} />
                <Stat label="Interruptions" value={String(p.interruptions ?? 0)} />
              </div>
              {p.score && (
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <Stat label="Clarity" value={p.score.clarity.toFixed(1)} />
                  <Stat label="Reasoning" value={p.score.reasoning.toFixed(1)} />
                  <Stat label="Collab" value={p.score.collaboration.toFixed(1)} />
                  <Stat label="Evidence" value={p.score.evidence.toFixed(1)} />
                  <Stat label="EQ" value={p.score.emotional_intelligence.toFixed(1)} />
                  <Stat label="Leadership" value={p.score.leadership.toFixed(1)} />
                </div>
              )}
              {p.real_user_id && (
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/home/session/${session.id}/report`}>Open full report</Link>
                  </Button>
                </div>
              )}
            </CardContent></Card>
          ))}
          {humans.length === 0 && <p className="text-sm text-muted-foreground">No human participants recorded.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          AI personas ({ais.length})
        </h2>
        <div className="grid gap-2 md:grid-cols-2">
          {ais.map((p) => (
            <div key={p.id} className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{p.persona_name}</div>
                  {p.persona_role && <div className="text-[11px] text-muted-foreground">{p.persona_role}</div>}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {p.message_count ?? 0} msg · {p.words ?? 0}w
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/50 px-2 py-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
