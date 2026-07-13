import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface ErrRow {
  id: string;
  error_message: string;
  error_stack: string | null;
  error_source: string | null;
  page_url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

type Key = "created_at" | "error_source" | "error_message";
const PAGE_SIZE = 30;
const REFRESH_MS = 30_000;

export default function AdminEdgeErrors() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [sortKey, setSortKey] = useState<Key>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(0); }, [qDebounced, sortKey, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("error_logs")
      .select("id, error_message, error_stack, error_source, page_url, created_at, metadata", { count: "exact" })
      .like("error_source", "edge_%")
      .order(sortKey, { ascending: sortDir === "asc" })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (qDebounced) query = query.ilike("error_message", `%${qDebounced}%`);
    const { data, count } = await query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows(((data as any[]) ?? []) as ErrRow[]);
    setTotal(count ?? 0);

    // Alert: count errors in last 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .like("error_source", "edge_%")
      .gte("created_at", since);
    setAlertCount(recent ?? 0);

    setLoading(false);
  }, [qDebounced, sortKey, sortDir, page]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh
  useEffect(() => {
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  function toggleSort(k: Key) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const alertActive = alertCount >= 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edge function errors</h1>
          <p className="text-sm text-muted-foreground">Structured logs from all backend edge functions. Auto-refreshes every 30s.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input placeholder="Search message…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {alertActive && (
        <Card className="border-destructive/60 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <div className="font-semibold text-destructive">Alert: {alertCount} edge function errors in the last 15 minutes</div>
              <div className="text-xs text-muted-foreground">Threshold ≥ 5. Investigate the top failing function below.</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="Errors (15m)" value={alertCount} accent={alertActive} />
        <Metric label="Total logged" value={total} />
        <Metric label="Sort" value={`${sortKey} ${sortDir}`} />
        <Metric label="Auto refresh" value="30s" />
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <SortableTh label="When" active={sortKey === "created_at"} dir={sortDir} onClick={() => toggleSort("created_at")} />
                <SortableTh label="Function" active={sortKey === "error_source"} dir={sortDir} onClick={() => toggleSort("error_source")} />
                <SortableTh label="Message" active={sortKey === "error_message"} dir={sortDir} onClick={() => toggleSort("error_message")} />
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = (r.metadata as { status?: number } | null)?.status;
                return (
                  <tr key={r.id} className="border-t border-border/60 align-top hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{(r.error_source ?? "").replace(/^edge_/, "")}</td>
                    <td className="px-3 py-2 max-w-[520px]">
                      <div className="truncate font-medium">{r.error_message}</div>
                      {r.error_stack && <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{r.error_stack.split("\n")[0]}</div>}
                    </td>
                    <td className="px-3 py-2">
                      {status ? <Badge variant={status >= 500 ? "destructive" : "secondary"} className="text-[10px]">{status}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No edge function errors logged. 🎉</td></tr>}
              {loading && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total === 0 ? "0" : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)}`} of {total}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-md border ${accent ? "border-destructive/60 bg-destructive/5" : "border-border/60 bg-card"} px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${accent ? "text-destructive" : ""}`}>{value}</div>
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
