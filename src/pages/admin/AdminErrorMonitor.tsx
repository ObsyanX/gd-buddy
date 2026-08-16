import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Zap,
  ServerCog,
  MonitorSmartphone,
  Users,
  ShieldAlert,
} from "lucide-react";

interface ErrRow {
  id: string;
  error_message: string;
  error_stack: string | null;
  error_source: string;
  page_url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

type GroupKey = "all" | "ai_lovable" | "ai_groq" | "ai_both" | "edge" | "session" | "client" | "auth";

const GROUPS: { key: GroupKey; label: string; icon: typeof Sparkles; hint: string }[] = [
  { key: "all", label: "All", icon: AlertTriangle, hint: "Every recorded failure" },
  { key: "ai_lovable", label: "Lovable AI", icon: Sparkles, hint: "Gateway rejected / failed" },
  { key: "ai_groq", label: "Groq", icon: Zap, hint: "Fallback provider failures" },
  { key: "ai_both", label: "AI total outage", icon: ShieldAlert, hint: "Both providers failed" },
  { key: "edge", label: "Edge functions", icon: ServerCog, hint: "Server-side function errors" },
  { key: "session", label: "Discussion sessions", icon: Users, hint: "Errors inside a live room" },
  { key: "client", label: "Client", icon: MonitorSmartphone, hint: "Browser runtime errors" },
  { key: "auth", label: "Auth", icon: ShieldAlert, hint: "Sign-in / email failures" },
];

const PAGE_SIZE = 30;
const REFRESH_MS = 30_000;

function applyGroup<T extends { like: (c: string, p: string) => T; eq: (c: string, v: string) => T; not: (c: string, op: string, v: string) => T }>(
  q: T,
  group: GroupKey,
): T {
  switch (group) {
    case "ai_lovable": return q.eq("error_source", "ai_lovable");
    case "ai_groq": return q.eq("error_source", "ai_groq");
    case "ai_both": return q.eq("error_source", "ai_both");
    case "edge": return q.like("error_source", "edge_%");
    case "session": return q.eq("error_source", "session");
    case "client": return q.eq("error_source", "client");
    case "auth": return q.like("error_source", "auth%");
    default: return q;
  }
}

function severityOf(row: ErrRow): string {
  const s = (row.metadata?.severity as string) || "";
  if (s) return s;
  if (row.error_source === "ai_both") return "critical";
  return "medium";
}

function sevVariant(sev: string): "destructive" | "secondary" | "outline" {
  if (sev === "critical" || sev === "high") return "destructive";
  if (sev === "medium") return "secondary";
  return "outline";
}

export default function AdminErrorMonitor() {
  const [group, setGroup] = useState<GroupKey>("all");
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [counts, setCounts] = useState<Record<GroupKey, number>>({} as Record<GroupKey, number>);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(0); }, [group, qDebounced]);

  const since24h = useMemo(() => new Date(Date.now() - 24 * 3600 * 1000).toISOString(), []);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      GROUPS.map(async (g) => {
        const base = supabase
          .from("error_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await applyGroup(base as any, g.key);
        return [g.key, count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(entries) as Record<GroupKey, number>);
  }, [since24h]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("error_logs")
      .select("id, error_message, error_stack, error_source, page_url, created_at, metadata", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = applyGroup(query as any, group);
    if (qDebounced) query = query.ilike("error_message", `%${qDebounced}%`);
    const { data, count, error } = await query;
    if (error) console.error("[error-monitor] load failed", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows(((data as any[]) ?? []) as ErrRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [group, page, qDebounced]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  useEffect(() => {
    const id = setInterval(() => { load(); loadCounts(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, loadCounts]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const aiOutage = counts.ai_both ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI &amp; error monitor</h1>
          <p className="text-sm text-muted-foreground">
            Provider-differentiated AI failures, edge function errors and live-session issues (last 24h counts).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { load(); loadCounts(); }} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {aiOutage > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <span>
              <strong>{aiOutage}</strong> request(s) failed on <em>both</em> Lovable AI and Groq in the last 24h — AI features may be degraded.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const active = group === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              aria-pressed={active}
              className={`rounded-xl border p-4 text-left transition-colors min-h-[88px] ${
                active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4" /> {g.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{counts[g.key] ?? 0}</div>
              <div className="text-[11px] text-muted-foreground">{g.hint}</div>
            </button>
          );
        })}
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search error message…"
        aria-label="Search error message"
      />

      <Card>
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No errors recorded for this filter.</div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const meta = r.metadata ?? {};
                const sev = severityOf(r);
                const sessionId = meta.session_id as string | undefined;
                const isOpen = expanded === r.id;
                return (
                  <li key={r.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={sevVariant(sev)}>{sev}</Badge>
                      <Badge variant="outline">{r.error_source}</Badge>
                      {typeof meta.status === "number" && meta.status > 0 && (
                        <Badge variant="outline">HTTP {String(meta.status)}</Badge>
                      )}
                      {meta.model ? <Badge variant="outline">{String(meta.model)}</Badge> : null}
                      {meta.function_name ? <Badge variant="outline">fn: {String(meta.function_name)}</Badge> : null}
                      {meta.fallback_used ? <Badge variant="secondary">fell back to Groq</Badge> : null}
                      <span className="ml-auto text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm">{r.error_message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {r.page_url && <span className="truncate max-w-[320px]">{r.page_url}</span>}
                      {sessionId && (
                        <Link className="text-primary underline" to={`/home/admin/sessions/${sessionId}`}>
                          View session
                        </Link>
                      )}
                      {(r.error_stack || Object.keys(meta).length > 0) && (
                        <button className="underline" onClick={() => setExpanded(isOpen ? null : r.id)}>
                          {isOpen ? "Hide details" : "Details"}
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
{JSON.stringify(meta, null, 2)}
{r.error_stack ? `\n\n${r.error_stack}` : ""}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{total} record(s)</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="self-center text-muted-foreground">{page + 1} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
