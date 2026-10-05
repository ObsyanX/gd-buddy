import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; session_id: string | null; user_id: string; kind: string; ok: boolean; payload: any; is_drive: boolean; is_group: boolean; created_at: string };
type Filter = "all" | "solo" | "group" | "drive";

const LABELS: Record<string, string> = {
  room_open: "Room opened", room_close: "Room closed", mic_permission: "Mic permission", soundcheck: "Soundcheck",
  vad_start: "Voice detected", vad_release: "Silence release", autosend_start: "Auto-send countdown", autosend_fire: "Auto-send fired",
  autosend_cancel: "Auto-send cancelled", floor_request: "Mic request", floor_grant: "Mic granted", floor_queue: "Mic queued",
  floor_release: "Mic released", interjection: "Interjection", icebreaker: "Icebreaker prompt", ai_reply: "AI reply",
  tts_play: "Voice playback", stt_result: "Speech-to-text", participant_join: "Joined", participant_leave: "Left", drive_join: "Drive code join",
};

/**
 * Room health — reads room_test_events. Row-level security scopes the data:
 * admins see every room, instructors see rooms they host, others their own.
 */
export default function RoomHealthPanel({ title = "Room health" }: { title?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [days, setDays] = useState(7);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    supabase.from("room_test_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(5000)
      .then(({ data }) => { if (!cancel) { setRows((data ?? []) as Row[]); setLoading(false); } });
    return () => { cancel = true; };
  }, [days]);

  const filtered = useMemo(() => rows.filter((r) =>
    filter === "all" ? true : filter === "drive" ? r.is_drive : filter === "group" ? r.is_group && !r.is_drive : !r.is_group), [rows, filter]);

  const byKind = useMemo(() => {
    const m = new Map<string, { total: number; failed: number }>();
    for (const r of filtered) { const v = m.get(r.kind) ?? { total: 0, failed: 0 }; v.total++; if (!r.ok) v.failed++; m.set(r.kind, v); }
    return [...m.entries()].sort((a, b) => b[1].failed - a[1].failed || b[1].total - a[1].total);
  }, [filtered]);

  const rooms = useMemo(() => new Set(filtered.map((r) => r.session_id)).size, [filtered]);
  const silentRooms = useMemo(() => {
    const opened = new Set(filtered.filter((r) => r.kind === "room_open").map((r) => r.session_id));
    const spoke = new Set(filtered.filter((r) => r.kind === "vad_start").map((r) => r.session_id));
    return [...opened].filter((s) => !spoke.has(s)).length;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {(["all", "solo", "group", "drive"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Rooms</div><div className="text-2xl font-semibold">{rooms}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Events</div><div className="text-2xl font-semibold">{filtered.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Failed steps</div><div className="text-2xl font-semibold text-destructive">{filtered.filter((r) => !r.ok).length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Rooms with no voice heard</div><div className="text-2xl font-semibold">{silentRooms}</div></Card>
      </div>
      <Card className="p-4">
        <h3 className="font-medium mb-3">Steps</h3>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : byKind.length === 0 ? (
          <p className="text-sm text-muted-foreground">No room events recorded yet for this period.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2">Step</th><th>Total</th><th>Failed</th><th>Failure rate</th></tr></thead>
            <tbody>{byKind.map(([k, v]) => (
              <tr key={k} className="border-t border-border"><td className="py-2">{LABELS[k] ?? k}</td><td>{v.total}</td>
                <td className={v.failed ? "text-destructive" : ""}>{v.failed}</td><td>{Math.round((v.failed / v.total) * 100)}%</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-medium mb-3">Recent failures</h3>
        <ul className="space-y-2 text-sm">
          {filtered.filter((r) => !r.ok).slice(0, 30).map((r) => (
            <li key={r.id} className="flex flex-wrap gap-2 items-center">
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              <Badge variant="destructive">{LABELS[r.kind] ?? r.kind}</Badge>
              {r.is_drive && <Badge variant="outline">Drive</Badge>}
              <span className="text-muted-foreground truncate max-w-md">{JSON.stringify(r.payload)}</span>
            </li>
          ))}
          {!filtered.some((r) => !r.ok) && <li className="text-muted-foreground">No failures.</li>}
        </ul>
      </Card>
    </div>
  );
}

/** Per-room timeline for the session report. */
export function RoomTimeline({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase.from("room_test_events").select("*").eq("session_id", sessionId).order("created_at").limit(500)
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [sessionId]);
  if (!rows.length) return null;
  const start = new Date(rows[0].created_at).getTime();
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">What happened in this room</h3>
      <ol className="space-y-1 text-sm max-h-72 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex gap-3">
            <span className="w-14 shrink-0 text-muted-foreground tabular-nums">+{Math.round((new Date(r.created_at).getTime() - start) / 1000)}s</span>
            <span className={r.ok ? "" : "text-destructive"}>{LABELS[r.kind] ?? r.kind}{r.ok ? "" : " (failed)"}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
