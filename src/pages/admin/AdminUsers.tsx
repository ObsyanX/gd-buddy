import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import { toast } from "@/hooks/use-toast";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";
import { Eye, Users2, Trophy, Clock, MessageSquare } from "lucide-react";

interface Row {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
}

interface SessionRow {
  id: string;
  topic: string;
  topic_category: string | null;
  status: string;
  is_multiplayer: boolean | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

interface UserDetail {
  sessions: SessionRow[];
  scores: Array<{ session_id: string; overall: number; clarity: number; reasoning: number; collaboration: number; leadership: number }>;
  feedbackCount: number;
  xp: number;
  level: number;
}

const ASSIGNABLE: AppRole[] = ["editor", "analyst", "instructor"];

function fmtDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function AdminUsers() {
  const { isAdmin } = useUserRoles();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, AppRole[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as AppRole); map.set(r.user_id, arr);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRows(((profiles as any[]) ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? ["user"] })));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openDetail(row: Row) {
    setSelected(row);
    setDetail(null);
    setLoadingDetail(true);
    const [sessRes, scoreRes, fbRes, profRes] = await Promise.all([
      supabase
        .from("gd_sessions")
        .select("id, topic, topic_category, status, is_multiplayer, start_time, end_time, created_at")
        .or(`user_id.eq.${row.id},host_user_id.eq.${row.id}`)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("session_scores").select("session_id, overall, clarity, reasoning, collaboration, leadership").eq("user_id", row.id),
      supabase.from("user_feedback").select("id", { count: "exact", head: true }).eq("user_id", row.id),
      supabase.from("profiles").select("xp, level").eq("id", row.id).maybeSingle(),
    ]);
    setDetail({
      sessions: (sessRes.data as SessionRow[]) ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scores: (scoreRes.data as any[]) ?? [],
      feedbackCount: fbRes.count ?? 0,
      xp: (profRes.data as { xp?: number } | null)?.xp ?? 0,
      level: (profRes.data as { level?: number } | null)?.level ?? 1,
    });
    setLoadingDetail(false);
  }

  async function grant(userId: string, role: AppRole) {
    if (!isAdmin) return;
    setBusy(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("user_roles") as any).insert({ user_id: userId, role });
    setBusy(null);
    if (error) return toast({ title: "Grant failed", description: error.message, variant: "destructive" });
    await supabase.from("audit_events").insert({ action: "role_grant", resource_type: "user", resource_id: userId, metadata: { role } as never });
    toast({ title: `Granted ${role}` });
    load();
  }

  async function revoke(userId: string, role: AppRole) {
    if (!isAdmin) return;
    if (role === "admin") return toast({ title: "Admin role cannot be revoked from here", variant: "destructive" });
    setBusy(userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    setBusy(null);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    await supabase.from("audit_events").insert({ action: "role_revoke", resource_type: "user", resource_id: userId, metadata: { role } as never });
    toast({ title: `Revoked ${role}` });
    load();
  }

  const filtered = rows.filter((r) => !q || (r.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || r.id.includes(q));

  const summary = useMemo(() => {
    if (!detail) return null;
    const total = detail.sessions.length;
    const solo = detail.sessions.filter((s) => !s.is_multiplayer).length;
    const multi = total - solo;
    const completed = detail.sessions.filter((s) => s.status === "completed").length;
    const totalMs = detail.sessions.reduce((acc, s) => {
      if (s.start_time && s.end_time) return acc + Math.max(0, new Date(s.end_time).getTime() - new Date(s.start_time).getTime());
      return acc;
    }, 0);
    const avgOverall = detail.scores.length
      ? detail.scores.reduce((a, s) => a + (s.overall ?? 0), 0) / detail.scores.length
      : 0;
    const topicCounts = new Map<string, number>();
    detail.sessions.forEach((s) => {
      const key = s.topic_category || s.topic || "Unknown";
      topicCounts.set(key, (topicCounts.get(key) ?? 0) + 1);
    });
    const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, solo, multi, completed, totalMs, avgOverall, topTopics };
  }, [detail]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} profiles · {isAdmin ? "role management enabled" : "read-only (admin only can edit roles)"}</p>
        </div>
        <Input placeholder="Search name or id…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Roles</th>
                <th className="text-left px-3 py-2">Joined</th>
                <th className="text-left px-3 py-2">Details</th>
                {isAdmin && <th className="text-left px-3 py-2">Grant</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.display_name ?? "(no name)"}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2 space-x-1 space-y-1">
                    {r.roles.map((role) => (
                      <span key={role} className="inline-flex items-center gap-1">
                        <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
                        {isAdmin && role !== "user" && role !== "admin" && (
                          <button onClick={() => revoke(r.id, role)} className="text-[10px] text-muted-foreground hover:text-destructive" title={`Revoke ${role}`}>×</button>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1 items-center">
                        <Select onValueChange={(v) => grant(r.id, v as AppRole)}>
                          <SelectTrigger className="h-8 w-32 text-xs" disabled={busy === r.id}><SelectValue placeholder="Add role…" /></SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE.filter((role) => !r.roles.includes(role)).map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setDetail(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.display_name ?? "(no name)"}</SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.id}</SheetDescription>
              </SheetHeader>

              {loadingDetail && <p className="text-sm text-muted-foreground mt-6">Loading user activity…</p>}

              {detail && summary && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatBox icon={<Users2 className="h-4 w-4" />} label="Sessions" value={String(summary.total)} />
                    <StatBox icon={<MessageSquare className="h-4 w-4" />} label="Solo / Multi" value={`${summary.solo} / ${summary.multi}`} />
                    <StatBox icon={<Clock className="h-4 w-4" />} label="Total time" value={`${Math.round(summary.totalMs / 60000)}m`} />
                    <StatBox icon={<Trophy className="h-4 w-4" />} label="Avg score" value={summary.avgOverall ? summary.avgOverall.toFixed(1) : "—"} />
                    <StatBox label="Completed" value={String(summary.completed)} />
                    <StatBox label="Feedback given" value={String(detail.feedbackCount)} />
                    <StatBox label="Level" value={String(detail.level)} />
                    <StatBox label="XP" value={String(detail.xp)} />
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Top topics</h3>
                    {summary.topTopics.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
                    <div className="flex flex-wrap gap-2">
                      {summary.topTopics.map(([topic, count]) => (
                        <Badge key={topic} variant="secondary" className="max-w-[240px]">
                          <span className="truncate">{topic}</span>
                          <span className="ml-2 opacity-70">×{count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Recent sessions</h3>
                    <div className="border border-border/60 rounded-md divide-y divide-border/60 max-h-[360px] overflow-y-auto">
                      {detail.sessions.slice(0, 30).map((s) => {
                        const score = detail.scores.find((sc) => sc.session_id === s.id);
                        return (
                          <a
                            key={s.id}
                            href={`/home/admin/sessions/${s.id}`}
                            className="block px-3 py-2 hover:bg-muted/40 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{s.topic}</span>
                              <Badge variant="outline" className="text-[10px]">{s.is_multiplayer ? "multi" : "solo"}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                              <span>{new Date(s.created_at).toLocaleString()} · {fmtDuration(s.start_time, s.end_time)}</span>
                              <span>{score ? `score ${score.overall.toFixed(1)}` : s.status}</span>
                            </div>
                          </a>
                        );
                      })}
                      {detail.sessions.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">No sessions.</p>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {isAdmin && (
        <p className="text-xs text-muted-foreground">
          Admin role is restricted to the authorized administrator by a database trigger — it cannot be granted from this UI.
        </p>
      )}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
