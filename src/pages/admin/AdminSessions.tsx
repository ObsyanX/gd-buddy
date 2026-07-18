import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { TableSkeleton, EmptyState } from "@/components/admin/TableSkeleton";
import { safeMode, safeStatus, safeSearch, type SessionMode, type SessionStatus } from "@/lib/admin-query-params";

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

type SortKey = "topic" | "status" | "is_multiplayer" | "created_at" | "participants";
const PAGE_SIZE = 25;

function durationLabel(s: Row) {
  if (!s.start_time || !s.end_time) return "—";
  const ms = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${m}m ${sec}s`;
}

export default function AdminSessions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState(safeSearch(searchParams.get("q")));
  const [qDebounced, setQDebounced] = useState(safeSearch(searchParams.get("q")));
  const [mode, setMode] = useState<SessionMode>(safeMode(searchParams.get("mode")));
  const [status, setStatus] = useState<SessionStatus>(safeStatus(searchParams.get("status")));
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Debounce search input to avoid a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(safeSearch(q)), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset to page 0 whenever filters change.
  useEffect(() => { setPage(0); }, [qDebounced, mode, status, sortKey, sortDir]);

  // Sync active filters into the URL so refresh / share preserves state.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const setOrDel = (k: string, v: string, def: string) => {
      if (v && v !== def) next.set(k, v); else next.delete(k);
    };
    setOrDel("q", qDebounced, "");
    setOrDel("mode", mode, "all");
    setOrDel("status", status, "all");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, mode, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    // Fail gracefully if the round-trip stalls — the empty-state renders an error retry.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please retry.")), 12_000),
    );
    try {
      await Promise.race([timeout, (async () => {
        // participants sorting can't be pushed to Postgres cheaply — sort in-memory after fetch.
        const serverSortable = sortKey !== "participants";
        let query = supabase
          .from("gd_sessions")
          .select("id, topic, topic_category, status, is_multiplayer, start_time, end_time, created_at, user_id, host_user_id", { count: "exact" });

        if (mode === "solo") query = query.eq("is_multiplayer", false);
        if (mode === "multi") query = query.eq("is_multiplayer", true);
        if (status !== "all") query = query.eq("status", status as never);
        if (qDebounced) query = query.ilike("topic", `%${qDebounced}%`);

        if (serverSortable) {
          query = query.order(sortKey, { ascending: sortDir === "asc" });
        } else {
          query = query.order("created_at", { ascending: false });
        }
        query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        const { data, count, error } = await query;
        if (error) throw error;
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

        let hydrated = list.map((s) => ({
          ...s,
          participants: partMap.get(s.id) ?? 0,
          host_name: nameMap.get(s.host_user_id || s.user_id || "") ?? null,
        }));

        if (sortKey === "participants") {
          hydrated = hydrated.sort((a, b) => sortDir === "asc" ? a.participants - b.participants : b.participants - a.participants);
        }

        setRows(hydrated);
        setTotal(count ?? 0);
      })()]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load sessions.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [mode, status, qDebounced, sortKey, sortDir, page]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "created_at" ? "desc" : "asc"); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total} sessions · page ${page + 1} of ${totalPages}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search topic…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="solo">Solo</SelectItem>
              <SelectItem value="multi">Multiplayer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(safeStatus(v))}>
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
                <SortableTh label="Topic" active={sortKey === "topic"} dir={sortDir} onClick={() => toggleSort("topic")} />
                <SortableTh label="Mode" active={sortKey === "is_multiplayer"} dir={sortDir} onClick={() => toggleSort("is_multiplayer")} />
                <th className="text-left px-3 py-2">Host</th>
                <SortableTh label="Participants" active={sortKey === "participants"} dir={sortDir} onClick={() => toggleSort("participants")} />
                <th className="text-left px-3 py-2">Duration</th>
                <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
                <SortableTh label="Started" active={sortKey === "created_at"} dir={sortDir} onClick={() => toggleSort("created_at")} />
                <th className="text-left px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
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
              {loading && <TableSkeleton rows={6} cols={8} />}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState
                    title="No sessions match these filters"
                    description={qDebounced || mode !== "all" || status !== "all"
                      ? "Try clearing the search or switching status/mode."
                      : "Sessions will appear here once users start discussions."}
                    action={(qDebounced || mode !== "all" || status !== "all") && (
                      <Button size="sm" variant="outline" onClick={() => { setQ(""); setMode("all"); setStatus("all"); }}>
                        Clear filters
                      </Button>
                    )}
                  />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)}`} of {total}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="text-left px-3 py-2">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        <span>{label}</span>
        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}
