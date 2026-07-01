import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, MessageSquare, Star, AlertTriangle, Trash2, ShieldAlert,
  TrendingUp, Sparkles, Lightbulb, Bug, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['hsl(var(--primary))', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'];

// ---------- Error classification ----------
type Severity = 'critical' | 'high' | 'medium' | 'low';
interface ErrCat {
  category: string;
  severity: Severity;
  cause: string;
  fix: string;
  vuln?: string;
}
const classify = (msg: string): ErrCat => {
  const m = (msg || '').toLowerCase();
  if (m.includes('audiocontext')) return {
    category: 'Audio Runtime',
    severity: 'low',
    cause: 'AudioContext.close() called on an already-closed context (double-cleanup on unmount).',
    fix: 'Guard with `if (ctx.state !== "closed") await ctx.close()` inside the cleanup effect in useAudioAnalysis / useAudioRecorder.',
  };
  if (m.includes('cannot access') && m.includes('before initialization')) return {
    category: 'React Hoisting',
    severity: 'high',
    cause: 'Temporal Dead Zone — a `const` (recalculateMetrics) is referenced inside a hook/effect before its declaration.',
    fix: 'Move the declaration above the useEffect/useCallback that references it, or wrap it in useCallback declared earlier in the file.',
  };
  if (m.includes('should have a queue')) return {
    category: 'React Internal',
    severity: 'critical',
    cause: 'Hooks order changed between renders (conditional hook usage or component identity change).',
    fix: 'Audit conditional `useState/useEffect` calls in DiscussionRoom & children. Ensure hooks are called unconditionally at the top level.',
    vuln: 'Can crash the discussion session and cause data-loss for in-progress GDs.',
  };
  if (m.includes('network') || m.includes('failed to fetch')) return {
    category: 'Network',
    severity: 'medium',
    cause: 'Fetch failed — likely offline, CORS, or edge function cold-start timeout.',
    fix: 'Add retry-with-backoff around Supabase edge-function calls and surface a toast on final failure.',
  };
  if (m.includes('permission') || m.includes('rls')) return {
    category: 'Security / RLS',
    severity: 'high',
    cause: 'Row Level Security denied a query.',
    fix: 'Review policies on the target table; ensure `auth.uid()` matches the row owner or grant a read policy for the required role.',
    vuln: 'Broken authorization boundary — verify no data leaks across users.',
  };
  return {
    category: 'Uncategorized',
    severity: 'medium',
    cause: 'Unclassified runtime error.',
    fix: 'Add a breadcrumb log around the failing call site to capture context.',
  };
};

const severityColor = (s: Severity) =>
  s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'default' : 'secondary';

const RESOLVED_ERROR_PATTERNS = [
  'Cannot close a closed AudioContext.',
  "Cannot access 'recalculateMetrics' before initialization",
  'Should have a queue. This is likely a bug in React.',
];

const RECENT_ERROR_WINDOW_MS = 24 * 60 * 60 * 1000;

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const [profRes, sessRes, fbRes, errRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('gd_sessions').select('id, topic, status, created_at, is_multiplayer, user_id').order('created_at', { ascending: false }).limit(500),
      supabase.from('user_feedback').select('*, gd_sessions(topic), profiles!user_feedback_user_id_fkey(display_name)').order('created_at', { ascending: false }).limit(500),
      supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    setUsers(profRes.data || []);
    setSessions(sessRes.data || []);
    setFeedback(fbRes.data || []);
    setErrors(errRes.data || []);
    setRefreshing(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const stats = useMemo(() => {
    const avg = feedback.reduce((s, f) => s + (f.stars || 0), 0) / Math.max(1, feedback.length);
    return {
      users: users.length,
      sessions: sessions.length,
      feedback: feedback.length,
      avgRating: Math.round(avg * 10) / 10,
      errors: errors.length,
    };
  }, [users, sessions, feedback, errors]);

  // 14-day timeseries
  const timeseries = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map((d) => {
      const key = d.getTime();
      const next = key + 86400000;
      const inDay = (arr: any[]) => arr.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= key && t < next;
      }).length;
      return {
        date: format(d, 'MMM d'),
        users: inDay(users),
        sessions: inDay(sessions),
        errors: inDay(errors),
        feedback: inDay(feedback),
      };
    });
  }, [users, sessions, errors, feedback]);

  // Error categorization
  const errorGroups = useMemo(() => {
    const groups = new Map<string, { category: string; severity: Severity; count: number; sample: any; cause: string; fix: string; vuln?: string; lastSeen: string; pages: Set<string> }>();
    const cutoff = Date.now() - RECENT_ERROR_WINDOW_MS;
    for (const e of errors) {
      if (new Date(e.created_at).getTime() < cutoff) continue;
      const c = classify(e.error_message || '');
      const key = c.category + '|' + (e.error_message || '').slice(0, 80);
      const g = groups.get(key);
      if (g) {
        g.count++;
        g.pages.add(e.page_url || '');
        if (new Date(e.created_at) > new Date(g.lastSeen)) g.lastSeen = e.created_at;
      } else {
        groups.set(key, { ...c, count: 1, sample: e, lastSeen: e.created_at, pages: new Set([e.page_url || '']) });
      }
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }, [errors]);

  const categoryChart = useMemo(() => {
    const m = new Map<string, number>();
    errorGroups.forEach((g) => m.set(g.category, (m.get(g.category) || 0) + g.count));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [errorGroups]);

  const severityChart = useMemo(() => {
    const m = new Map<Severity, number>();
    errorGroups.forEach((g) => m.set(g.severity, (m.get(g.severity) || 0) + g.count));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [errorGroups]);

  const feedbackDist = useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 1; i <= 5; i++) m.set(i, 0);
    feedback.forEach((f) => m.set(f.stars || 0, (m.get(f.stars || 0) || 0) + 1));
    return [...m.entries()].filter(([k]) => k >= 1).map(([k, v]) => ({ stars: `${k}★`, count: v }));
  }, [feedback]);

  const sessionStatus = useMemo(() => {
    const m = new Map<string, number>();
    sessions.forEach((s) => m.set(s.status, (m.get(s.status) || 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [sessions]);

  // AI insights (deterministic, generated from stats)
  const insights = useMemo(() => {
    const items: { icon: any; title: string; desc: string; tone: 'ok' | 'warn' | 'bad' }[] = [];
    const audioCount = errorGroups.find((g) => g.category === 'Audio Runtime')?.count || 0;
    if (audioCount > 5) items.push({
      icon: Bug, tone: 'warn',
      title: `${audioCount} recurring "AudioContext closed" errors`,
      desc: 'Non-blocking, but noisy in logs. Add an `if (ctx.state !== "closed")` guard in the audio cleanup effect to silence them.',
    });
    const critical = errorGroups.filter((g) => g.severity === 'critical').reduce((s, g) => s + g.count, 0);
    if (critical > 0) items.push({
      icon: ShieldAlert, tone: 'bad',
      title: `${critical} critical React errors detected`,
      desc: 'These can crash active discussions. Prioritize fixing hook-order issues in DiscussionRoom and its children.',
    });
    const high = errorGroups.filter((g) => g.severity === 'high').reduce((s, g) => s + g.count, 0);
    if (high > 0) items.push({
      icon: AlertTriangle, tone: 'warn',
      title: `${high} high-severity issues`,
      desc: 'Includes hoisting/TDZ errors. Refactor `recalculateMetrics` to be declared before use.',
    });
    if (stats.feedback === 0) items.push({
      icon: Star, tone: 'warn',
      title: 'No user feedback collected yet',
      desc: 'Prompt users to submit the post-session feedback form to build a quality signal.',
    });
    if (stats.feedback > 0 && stats.avgRating < 3.5) items.push({
      icon: TrendingUp, tone: 'bad',
      title: `Average rating is ${stats.avgRating}★`,
      desc: 'Below the healthy threshold (3.5★). Review low-star comments in the Feedback tab for common complaints.',
    });
    if (stats.sessions > 0 && stats.users > 0 && stats.sessions / stats.users < 1.5) items.push({
      icon: Lightbulb, tone: 'warn',
      title: 'Low sessions-per-user ratio',
      desc: `${(stats.sessions / stats.users).toFixed(2)} sessions/user. Consider onboarding nudges or a starter drill flow.`,
    });
    if (items.length === 0) items.push({
      icon: Sparkles, tone: 'ok', title: 'All systems healthy', desc: 'No urgent issues detected in the latest window.',
    });
    return items;
  }, [errorGroups, stats]);

  const vulnerabilities = useMemo(
    () => errorGroups.filter((g) => g.vuln).map((g) => ({ title: g.category, note: g.vuln!, count: g.count })),
    [errorGroups]
  );

  const deleteError = async (id: string) => {
    await supabase.from('error_logs').delete().eq('id', id);
    setErrors((prev) => prev.filter((e) => e.id !== id));
    toast({ title: 'Log deleted' });
  };

  const clearCategory = async (category: string) => {
    const ids = errors.filter((e) => classify(e.error_message || '').category === category).map((e) => e.id);
    if (!ids.length) return;
    await supabase.from('error_logs').delete().in('id', ids);
    setErrors((prev) => prev.filter((e) => !ids.includes(e.id)));
    toast({ title: `Cleared ${ids.length} ${category} errors` });
  };

  const clearResolvedErrors = async () => {
    const ids = errors
      .filter((e) => RESOLVED_ERROR_PATTERNS.some((pattern) => (e.error_message || '').includes(pattern)))
      .map((e) => e.id);
    if (!ids.length) {
      toast({ title: 'No resolved historical errors to clear' });
      return;
    }
    await supabase.from('error_logs').delete().in('id', ids);
    setErrors((prev) => prev.filter((e) => !ids.includes(e.id)));
    toast({ title: `Cleared ${ids.length} resolved historical errors` });
  };

  if (loading) return <div className="p-8">Checking admin access…</div>;
  if (!isAdmin) return <Navigate to="/home" replace />;

  const KpiCard = ({ icon: Icon, label, value, sub, target }: any) => (
    <button
      onClick={() => setTab(target)}
      className={`text-left p-4 border-4 border-border rounded bg-card hover:bg-accent transition-colors ${tab === target ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs">{sub}</p>}
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-4xl font-bold">ADMIN DASHBOARD</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Badge variant="destructive">RESTRICTED ACCESS</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="USERS" value={stats.users} target="users" />
          <KpiCard icon={MessageSquare} label="SESSIONS" value={stats.sessions} target="sessions" />
          <KpiCard icon={Star} label="FEEDBACK" value={stats.feedback} sub={`avg ${stats.avgRating || 0}★`} target="feedback" />
          <KpiCard icon={AlertTriangle} label="ERRORS" value={stats.errors} target="errors" />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="errors">Errors ({errors.length})</TabsTrigger>
          </TabsList>

          {/* ---------- OVERVIEW ---------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">14-Day Activity</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="sessions" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="users" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="errors" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">Session Status</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={sessionStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                      {sessionStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">Feedback Distribution</h3>
                {feedbackDist.reduce((s, f) => s + f.count, 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">No feedback submitted yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={feedbackDist}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="stars" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">Errors by Severity</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={severityChart} dataKey="value" nameKey="name" outerRadius={80} label>
                      {severityChart.map((d, i) => (
                        <Cell key={i} fill={
                          d.name === 'critical' ? '#dc2626' :
                          d.name === 'high' ? '#f97316' :
                          d.name === 'medium' ? '#eab308' : '#22c55e'
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-4 border-4 border-border">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5" /> AI-Based Insights & Improvements</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.map((it, i) => {
                  const Icon = it.icon;
                  const border = it.tone === 'bad' ? 'border-destructive' : it.tone === 'warn' ? 'border-orange-500' : 'border-green-500';
                  return (
                    <div key={i} className={`border-2 ${border} p-3 rounded`}>
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-1" />
                        <div>
                          <p className="font-bold text-sm">{it.title}</p>
                          <p className="text-xs text-muted-foreground">{it.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {vulnerabilities.length > 0 && (
              <Card className="p-4 border-4 border-destructive">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-destructive">
                  <ShieldAlert className="w-5 h-5" /> Vulnerabilities Detected
                </h3>
                <div className="space-y-2">
                  {vulnerabilities.map((v, i) => (
                    <div key={i} className="border-2 border-border p-3 rounded">
                      <div className="font-bold flex items-center gap-2">
                        <span>{v.title}</span>
                        <Badge variant="destructive">{v.count}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.note}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ---------- USERS ---------- */}
          <TabsContent value="users" className="space-y-4">
            {(() => {
              const cutoff = Date.now() - 15 * 60 * 1000;
              const activeUserIds = new Set(
                sessions
                  .filter((s) => s.status === 'active' && new Date(s.last_activity_at || s.updated_at || s.created_at).getTime() > cutoff)
                  .map((s) => s.user_id)
              );
              const activeUsers = users.filter((u) => activeUserIds.has(u.id));
              const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
              const newSignups = users.filter((u) => new Date(u.created_at).getTime() > dayAgo);
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 border-2 border-border rounded">
                      <p className="text-xs text-muted-foreground">TOTAL SIGN-UPS</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                    <div className="p-3 border-2 border-green-500 rounded">
                      <p className="text-xs text-muted-foreground">CURRENTLY ACTIVE</p>
                      <p className="text-2xl font-bold text-green-500">{activeUsers.length}</p>
                      <p className="text-[10px] text-muted-foreground">in a live session (15m)</p>
                    </div>
                    <div className="p-3 border-2 border-primary rounded">
                      <p className="text-xs text-muted-foreground">NEW (24H)</p>
                      <p className="text-2xl font-bold text-primary">{newSignups.length}</p>
                    </div>
                  </div>

                  {activeUsers.length > 0 && (
                    <Card className="p-4 border-4 border-green-500">
                      <h3 className="font-bold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Currently Active Users
                      </h3>
                      <table className="w-full text-sm">
                        <thead className="text-left border-b-2 border-border">
                          <tr><th className="p-2">Name</th><th className="p-2">XP</th><th className="p-2">Joined</th></tr>
                        </thead>
                        <tbody>
                          {activeUsers.map((u) => (
                            <tr key={u.id} className="border-b border-border">
                              <td className="p-2">{u.display_name}</td>
                              <td className="p-2">{u.xp || 0}</td>
                              <td className="p-2 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}

                  <Card className="p-4 border-4 border-border max-h-[500px] overflow-auto">
                    <h3 className="font-bold mb-2">All Sign-ups ({users.length})</h3>
                    <table className="w-full text-sm">
                      <thead className="text-left border-b-2 border-border sticky top-0 bg-card">
                        <tr>
                          <th className="p-2">Status</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">XP</th>
                          <th className="p-2">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const isActive = activeUserIds.has(u.id);
                          const isNew = new Date(u.created_at).getTime() > dayAgo;
                          return (
                            <tr key={u.id} className="border-b border-border">
                              <td className="p-2">
                                {isActive ? (
                                  <Badge className="bg-green-500 hover:bg-green-500">LIVE</Badge>
                                ) : isNew ? (
                                  <Badge variant="default">NEW</Badge>
                                ) : (
                                  <Badge variant="outline">—</Badge>
                                )}
                              </td>
                              <td className="p-2">{u.display_name}</td>
                              <td className="p-2">{u.xp || 0}</td>
                              <td className="p-2 text-xs">{new Date(u.created_at).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </>
              );
            })()}
          </TabsContent>


          {/* ---------- SESSIONS ---------- */}
          <TabsContent value="sessions">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b-2 border-border sticky top-0 bg-card">
                  <tr><th className="p-2">Topic</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Date</th></tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-border">
                      <td className="p-2 truncate max-w-xs">{s.topic}</td>
                      <td className="p-2">{s.is_multiplayer ? 'Multi' : 'Solo'}</td>
                      <td className="p-2"><Badge variant="outline">{s.status}</Badge></td>
                      <td className="p-2 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ---------- FEEDBACK ---------- */}
          <TabsContent value="feedback">
            <Card className="p-4 border-4 border-border max-h-[600px] overflow-auto space-y-3">
              {feedback.map((f) => (
                <div key={f.id} className="border-2 border-border p-3 rounded">
                  <div className="flex justify-between mb-1">
                    <p className="font-bold">{f.profiles?.display_name || 'User'} — {f.stars}★</p>
                    <span className="text-xs">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Topic: {f.gd_sessions?.topic || '—'}</p>
                  {f.comments && <p className="text-sm">{f.comments}</p>}
                  <div className="flex gap-3 mt-1 text-xs">
                    <span>Quality: {f.quality_rating || '—'}★</span>
                    <span>AI: {f.ai_accuracy_rating || '—'}★</span>
                    <span>NPS: {f.nps ?? '—'}</span>
                  </div>
                </div>
              ))}
              {feedback.length === 0 && <p className="text-center text-muted-foreground">No feedback yet.</p>}
            </Card>
          </TabsContent>

          {/* ---------- ERRORS ---------- */}
          <TabsContent value="errors" className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 border-2 border-border rounded bg-muted/20">
              <div>
                <p className="font-bold text-sm">Active error window: last 24 hours</p>
                <p className="text-xs text-muted-foreground">Historical fixed React/Audio errors are kept out of active vulnerability grouping.</p>
              </div>
              <Button size="sm" variant="outline" onClick={clearResolvedErrors}>
                <Trash2 className="w-4 h-4 mr-1" /> Clear resolved old logs
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">Errors by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4 border-4 border-border">
                <h3 className="font-bold mb-2">Error Trend (14d)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-4 border-4 border-border space-y-3">
              <h3 className="font-bold">Grouped Errors — Root Cause & Fix</h3>
              {errorGroups.length === 0 && <p className="text-center text-muted-foreground">No active errors logged in the last 24 hours.</p>}
              {errorGroups.map((g, i) => (
                <div key={i} className="border-2 border-border p-3 rounded space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={severityColor(g.severity) as any}>{g.severity.toUpperCase()}</Badge>
                        <span className="font-bold">{g.category}</span>
                        <Badge variant="outline">{g.count}×</Badge>
                        <span className="text-xs text-muted-foreground">last: {new Date(g.lastSeen).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-1 font-mono break-words">{g.sample.error_message}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => clearCategory(g.category)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Clear all
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/40">
                      <p className="font-bold mb-1">🔎 Root cause</p><p>{g.cause}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/40">
                      <p className="font-bold mb-1">🛠️ Recommended fix</p><p>{g.fix}</p>
                    </div>
                    {g.vuln && (
                      <div className="p-2 rounded bg-destructive/10 md:col-span-2">
                        <p className="font-bold mb-1 text-destructive">⚠️ Vulnerability</p><p>{g.vuln}</p>
                      </div>
                    )}
                    <div className="md:col-span-2 text-muted-foreground">
                      Affected pages: {[...g.pages].filter(Boolean).slice(0, 3).map((p) => new URL(p).pathname).join(', ') || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            <RawErrorLog errors={errors} onDelete={deleteError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// ---------- Raw log with severity filter + expandable stack traces ----------
const RawErrorLog = ({ errors, onDelete }: { errors: any[]; onDelete: (id: string) => void }) => {
  const [severity, setSeverity] = useState<'all' | Severity>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const filtered = useMemo(() => {
    return errors.filter((e) => {
      const s: Severity = e.metadata?.severity || classify(e.error_message || '').severity;
      return severity === 'all' || s === severity;
    });
  }, [errors, severity]);

  return (
    <Card className="p-4 border-4 border-border max-h-[500px] overflow-auto space-y-2">
      <div className="flex items-center justify-between sticky top-0 bg-card pb-2 z-10">
        <h3 className="font-bold">Raw Log ({filtered.length})</h3>
        <div className="flex gap-1">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={severity === s ? 'default' : 'outline'}
              onClick={() => setSeverity(s)}
              className="text-xs h-7"
            >
              {s.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      {filtered.map((e) => {
        const sev: Severity = e.metadata?.severity || classify(e.error_message || '').severity;
        const isOpen = !!expanded[e.id];
        return (
          <div key={e.id} className="border border-border p-2 rounded text-xs space-y-1">
            <div className="flex justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={severityColor(sev) as any} className="uppercase text-[10px]">{sev}</Badge>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  <span className="text-muted-foreground">· {e.error_source}</span>
                </div>
                <p className="font-mono truncate mt-1">{e.error_message}</p>
              </div>
              <div className="flex gap-1">
                {e.error_stack && (
                  <Button size="sm" variant="ghost" onClick={() => setExpanded((p) => ({ ...p, [e.id]: !isOpen }))} className="h-7 text-xs">
                    {isOpen ? 'Hide' : 'Stack'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            {isOpen && e.error_stack && (
              <pre className="p-2 rounded bg-muted/40 overflow-auto whitespace-pre-wrap text-[10px] max-h-48">{e.error_stack}</pre>
            )}
          </div>
        );
      })}
      {filtered.length === 0 && <p className="text-center text-muted-foreground text-xs">No errors at this severity.</p>}
    </Card>
  );
};

export default Admin;
