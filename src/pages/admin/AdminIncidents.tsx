import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Siren, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface Incident {
  id: string;
  error_message: string;
  error_stack: string | null;
  error_source: string | null;
  page_url: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const LIMIT = 100;

const severityOf = (row: Incident): string => {
  const s = (row.metadata as { severity?: string } | null)?.severity;
  return s || "low";
};

const severityVariant = (s: string) =>
  s === "critical" ? "destructive" : s === "high" ? "destructive" : s === "medium" ? "secondary" : "outline";

export default function AdminIncidents() {
  const [rows, setRows] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("error_logs")
      .select("id,error_message,error_stack,error_source,page_url,created_at,metadata")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (err) setError(err.message);
    setRows((data as unknown as Incident[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.error_message, r.error_source, r.page_url, r.error_stack]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Siren className="w-5 h-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Production incidents</h1>
            <p className="text-sm text-muted-foreground">
              Last {LIMIT} captured incidents with timestamps and stack traces.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search message, source, URL…"
            className="w-56"
            aria-label="Search incidents"
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">Failed to load incidents: {error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 divide-y">
          {loading && rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Loading incidents…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No incidents recorded. All clear.</div>
          )}
          {filtered.map((row) => {
            const sev = severityOf(row);
            const isOpen = !!open[row.id];
            return (
              <div key={row.id} className="p-4 space-y-2">
                <button
                  type="button"
                  className="w-full text-left flex items-start gap-3"
                  onClick={() => setOpen((s) => ({ ...s, [row.id]: !s[row.id] }))}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(sev) as "default" | "secondary" | "destructive" | "outline"}>
                        {sev}
                      </Badge>
                      <Badge variant="outline">{row.error_source || "client"}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium break-words">{row.error_message}</p>
                    {row.page_url && (
                      <p className="text-xs text-muted-foreground break-all">{row.page_url}</p>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="pl-7 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Stack trace</p>
                      <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap text-muted-foreground">
                        {row.error_stack || "No stack trace captured."}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Metadata</p>
                      <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap text-muted-foreground">
                        {JSON.stringify(row.metadata ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
