import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Mail, Download, RefreshCw } from "lucide-react";
import { TableSkeleton, EmptyState } from "@/components/admin/TableSkeleton";
import { toast } from "@/hooks/use-toast";
import { feedbackFormUrl, openFeedbackInviteMail } from "@/lib/feedback-invite";

interface FeedbackRow {
  id: string;
  user_id: string;
  session_id: string | null;
  stars: number;
  quality_rating: number | null;
  ai_accuracy_rating: number | null;
  ui_rating: number | null;
  nps: number | null;
  comments: string | null;
  created_at: string;
}



export default function AdminFeedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [people, setPeople] = useState<Record<string, { name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("user_feedback")
      .select("id, user_id, session_id, stars, quality_rating, ai_accuracy_rating, ui_rating, nps, comments, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err) {
      setError(err.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as FeedbackRow[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      const map: Record<string, { name: string | null; email: string | null }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profs as any[] | null)?.forEach((p) => { map[p.id] = { name: p.display_name, email: p.email }; });
      setPeople(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const p = people[r.user_id];
      return (
        (p?.email ?? "").toLowerCase().includes(term) ||
        (p?.name ?? "").toLowerCase().includes(term) ||
        (r.comments ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, people, q]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const avg = (fn: (r: FeedbackRow) => number | null) => {
      const vals = rows.map(fn).filter((v): v is number => typeof v === "number" && v > 0);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "—";
    };
    const promoters = rows.filter((r) => (r.nps ?? -1) >= 9).length;
    const detractors = rows.filter((r) => (r.nps ?? 99) <= 6 && r.nps !== null).length;
    const withNps = rows.filter((r) => r.nps !== null).length;
    return {
      count: rows.length,
      stars: avg((r) => r.stars),
      quality: avg((r) => r.quality_rating),
      ai: avg((r) => r.ai_accuracy_rating),
      nps: withNps ? Math.round(((promoters - detractors) / withNps) * 100) : "—",
    };
  }, [rows]);

  function copyLink() {
    navigator.clipboard.writeText(feedbackFormUrl());
    toast({ title: "Feedback form link copied" });
  }

  function mailAll() {
    const emails = [...new Set(filtered.map((r) => people[r.user_id]?.email).filter(Boolean))] as string[];
    if (!emails.length) return toast({ title: "No email addresses available", variant: "destructive" });
    openFeedbackInviteMail(emails.join(","));
  }

  function exportCsv() {
    const header = ["created_at", "name", "email", "stars", "quality", "ai_accuracy", "ui", "nps", "session_id", "comments"];
    const lines = filtered.map((r) => {
      const p = people[r.user_id];
      return [r.created_at, p?.name ?? "", p?.email ?? "", r.stars, r.quality_rating ?? "", r.ai_accuracy_rating ?? "",
        r.ui_rating ?? "", r.nps ?? "", r.session_id ?? "", (r.comments ?? "").replace(/"/g, '""')]
        .map((v) => `"${String(v)}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gd-buddy-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} submissions`} · admin-only view
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search email, name or comment…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Button size="sm" variant="outline" onClick={() => load()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          <Button size="sm" variant="outline" onClick={copyLink}>Copy form link</Button>
          <Button size="sm" variant="outline" onClick={mailAll}><Mail className="h-3.5 w-3.5 mr-1" /> Email these users</Button>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {[["Submissions", stats.count], ["Avg stars", stats.stars], ["Avg quality", stats.quality], ["AI accuracy", stats.ai], ["NPS", stats.nps]].map(([label, value]) => (
            <Card key={String(label)}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{String(value)}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Ratings</th>
                <th className="text-left px-3 py-2">NPS</th>
                <th className="text-left px-3 py-2">Comments</th>
                <th className="text-left px-3 py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = people[r.user_id];
                return (
                  <tr key={r.id} className="border-t border-border/60 align-top hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p?.name ?? "(no name)"}</div>
                      <div className="text-xs text-muted-foreground">{r.session_id ? "Session feedback" : "General feedback"}</div>
                    </td>
                    <td className="px-3 py-2">
                      {p?.email ? (
                        <a className="underline text-xs" href={`mailto:${p.email}`}>{p.email}</a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-3.5 w-3.5 ${n <= r.stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Q {r.quality_rating ?? "—"} · AI {r.ai_accuracy_rating ?? "—"} · UI {r.ui_rating ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.nps === null ? "—" : (
                        <Badge variant={r.nps >= 9 ? "default" : r.nps <= 6 ? "destructive" : "secondary"}>{r.nps}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-md whitespace-pre-wrap">{r.comments ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {loading && <TableSkeleton rows={6} cols={6} />}
              {!loading && error && (
                <tr><td colSpan={6}>
                  <EmptyState title="Couldn't load feedback" description={error} action={<Button size="sm" variant="outline" onClick={() => load()}>Retry</Button>} />
                </td></tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr><td colSpan={6}><EmptyState title="No feedback yet" description="Share the feedback form link with users to start collecting responses." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
