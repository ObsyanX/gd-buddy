import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface Row {
  id: string;
  user_id: string | null;
  error_message: string;
  error_source: string;
  page_url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

type SortKey = "created_at" | "error_source" | "error_message";
const PAGE_SIZE = 30;
const REFRESH_MS = 60_000;

const CODE_LABELS: Record<string, string> = {
  popup_blocked: "Popup blocked",
  popup_closed: "Popup closed",
  access_denied: "Access denied",
  network_timeout: "Network / timeout",
  unauthorized_domain: "Unauthorized domain",
  provider_disabled: "Provider disabled",
  invalid_credentials: "Invalid credentials",
  email_taken: "Email in use",
  rate_limited: "Rate limited",
  session_missing: "Session missing",
  unknown: "Unknown",
};

export default function AdminAuthErrors() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [recent24h, setRecent24h] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(0); }, [qDebounced, provider, sortKey, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("error_logs")
      .select("id, user_id, error_message, error_source, page_url, created_at, metadata", { count: "exact" });

    if (provider === "all") {
      query = query.like("error_source", "auth_%");
    } else {
      query = query.eq("error_source", `auth_${provider}`);
    }

    query = query.order(sortKey, { ascending: sortDir === "asc" })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (qDebounced) query = query.ilike("error_message", `%${qDebounced}%`);

    const { data, count } = await query;
    setRows(((data as any[]) ?? []) as Row[]);
    setTotal(count ?? 0);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .like("error_source", "auth_%")
      .gte("created_at", since);
    setRecent24h(recent ?? 0);
    setLoading(false);
  }, [qDebounced, provider, sortKey, sortDir, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline w-3 h-3 ml-1" />
      : <ArrowDown className="inline w-3 h-3 ml-1" />;
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-destructive" aria-hidden="true" />
            Auth errors
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign-in failures across providers. User IDs shown only when the visitor was already signed in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recent24h > 0 && (
            <Badge variant={recent24h > 20 ? "destructive" : "secondary"}>
              {recent24h} in last 24h
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search error message…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-sm"
            />
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="microsoft">Microsoft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                    Time<SortIcon k="created_at" />
                  </th>
                  <th className="py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort("error_source")}>
                    Provider<SortIcon k="error_source" />
                  </th>
                  <th className="py-2 px-2">Code</th>
                  <th className="py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort("error_message")}>
                    Message<SortIcon k="error_message" />
                  </th>
                  <th className="py-2 px-2">User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No auth errors recorded.</td></tr>
                )}
                {rows.map((r) => {
                  const code = (r.metadata as any)?.code ?? "unknown";
                  const providerName = r.error_source.replace(/^auth_/, "");
                  return (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2 px-2 font-mono text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="capitalize">{providerName}</Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {CODE_LABELS[code] ?? code}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 max-w-md truncate" title={r.error_message}>
                        {r.error_message}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-muted-foreground">
                        {r.user_id ? `${r.user_id.slice(0, 8)}…` : <span className="italic">anonymous</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} total · page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
