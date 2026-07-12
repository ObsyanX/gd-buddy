import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface Row {
  id: string;
  topic: string;
  topic_category: string | null;
  status: string;
  is_multiplayer: boolean | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  user_id: string | null;
  host_user_id: string | null;
  participants: number;
  host_name?: string | null;
}

function durationLabel(s: Row) {
  if (!s.start_time || !s.end_time) return "—";
  const ms = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${m}m ${sec}s`;
}

export default function AdminSessions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "solo" | "multi">("all");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      let query = supabase
        .from("gd_sessions")
        .select("id, topic, topic_category, status, is_multiplayer, start_time, end_time, created_at, user_id, host_user_id")
        .order("created_at", { ascending: false })
        .limit(300);
      if (mode === "solo") query = query.eq("is_multiplayer", false);
      if (mode === "multi") query = query.eq("is_multiplayer", true);
      if (status !== "all") query = query.eq("status", status as never);
      const { data } = await query;
      if (cancel) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = ((data as any[]) ?? []) as Row[];
      const ids = list.map((s) => s.id);
      const hostIds = [...new Set(list.map((s) => s.host_user_id || s.user_id).filter(Boolean) as string[])];
      const [{ data: parts }, { data: profs }] = await Promise.all([
        ids.length ? supabase.from("gd_participants").select("session_id").in("session_id", ids) : Promise.resolve({ data: [] as { session_id: string }[] }),
        hostIds.length ? supabase.from("profiles").select("id, display_name").in("id", hostIds) : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
      ]);
      const partMap = new Map<string, number>();
      (parts ?? []).forEach((p: { session_id: string }) => partMap.set(p.session_id, (partMap.get(p.session_id) ?? 0) + 1));
      const nameMap = new Map<string, string | null>();
      (profs ?? []).forEach((p: { id: string; display_name: string | null }) => nameMap.set(p.id, p.display_name));
      setRows(list.map((s) => ({
        ...s,
        participants: partMap.get(s.id) ?? 0,
        host_name: nameMap.get(s.host_user_id || s.user_id || "") ?? null,
      })));
      setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [mode, status]);

  const filtered = rows.filter((r) => !q || r.topic.toLowerCase().includes(q.toLowerCase()) || (r.host_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">{rows.length} sessions · click any row for full report</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search topic or host…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="solo">Solo</SelectItem>
              <SelectItem value="multi">Multiplayer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="setup">Setup</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Topic</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">Host</th>
                <th className="text-left px-3 py-2">Participants</th>
                <th className="text-left px-3 py-2">Duration</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Started</th>
                <th className="text-left px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-3 py-2 max-w-[280px]">
                    <div className="font-medium truncate">{r.topic}</div>
                    {r.topic_category && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.topic_category}</div>}
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{r.is_multiplayer ? "multi" : "solo"}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[160px]">{r.host_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.participants}</td>
                  <td className="px-3 py-2 font-mono text-xs">{durationLabel(r)}</td>
                  <td className="px-3 py-2"><Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/home/admin/sessions/${r.id}`}><Eye className="h-3.5 w-3.5 mr-1" />Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No sessions.</td></tr>}
              {loading && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
