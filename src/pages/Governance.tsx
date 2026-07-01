/**
 * Track 9 · Slice 5 — Governance Dashboards (admin-only).
 *
 * Unified admin page with seven tabs:
 *   1. AI Costs         — spend per model/function, monthly trend
 *   2. Prompts          — CRUD + A/B toggle + version list
 *   3. Models           — activate/deactivate per purpose
 *   4. Performance      — perf_events vs perf_budgets (p50/p90/p95/p99)
 *   5. Experiments      — feature-flag / A/B panel
 *   6. Events           — filterable event_log explorer
 *   7. Safety           — safety_incidents by kind/verdict
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, MessageSquareCode, Cpu, Activity, FlaskConical, ListTree, Shield } from 'lucide-react';

/* ============================================================ */
/* AI Costs                                                     */
/* ============================================================ */
function CostsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('ai_costs').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  const byModel = useMemo(() => {
    const map: Record<string, { calls: number; tokens: number; cost: number }> = {};
    for (const r of rows) {
      const key = r.model_id || 'unknown';
      map[key] ??= { calls: 0, tokens: 0, cost: 0 };
      map[key].calls++;
      map[key].tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      map[key].cost += Number(r.cost_estimate ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
  }, [rows]);
  const total = byModel.reduce((s, [, v]) => s + v.cost, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi label="Calls (last 500)" value={rows.length} />
        <Kpi label="Est. spend" value={`$${total.toFixed(4)}`} />
        <Kpi label="Models used" value={byModel.length} />
      </div>
      <Card className="p-4 border-2">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1">Model</th><th>Calls</th><th>Tokens</th><th className="text-right">Cost</th></tr>
          </thead>
          <tbody>
            {byModel.map(([m, v]) => (
              <tr key={m} className="border-t">
                <td className="py-1 font-mono">{m}</td>
                <td>{v.calls}</td>
                <td>{v.tokens.toLocaleString()}</td>
                <td className="text-right font-mono">${v.cost.toFixed(4)}</td>
              </tr>
            ))}
            {byModel.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No AI cost events yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================ */
/* Prompts                                                      */
/* ============================================================ */
function PromptsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState({ category: '', version: 'v1', language: 'en', body: '', ab_flag: '' });
  const load = () =>
    supabase.from('prompts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  useEffect(() => { void load(); }, []);
  const create = async () => {
    if (!draft.category || !draft.body) return;
    const { error } = await supabase.from('prompts').insert({ ...draft, active: true });
    if (error) toast({ title: 'Insert failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Prompt saved' }); setDraft({ category: '', version: 'v1', language: 'en', body: '', ab_flag: '' }); void load(); }
  };
  const toggle = async (r: any) => {
    await supabase.from('prompts').update({ active: !r.active }).eq('id', r.id);
    void load();
  };
  return (
    <div className="space-y-4">
      <Card className="p-4 border-2 space-y-3">
        <h3 className="font-bold">New prompt</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="category (e.g. moderator.nudge)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          <Input placeholder="version" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} />
          <Input placeholder="language" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} />
          <Input placeholder="A/B flag (optional)" value={draft.ab_flag} onChange={(e) => setDraft({ ...draft, ab_flag: e.target.value })} />
        </div>
        <Textarea rows={4} placeholder="Prompt body…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <Button onClick={create}>Save prompt</Button>
      </Card>
      <Card className="p-4 border-2">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th>Category</th><th>Ver</th><th>Lang</th><th>A/B</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 font-mono">{r.category}</td>
                <td>{r.version}</td><td>{r.language}</td><td>{r.ab_flag || '—'}</td>
                <td><Switch checked={!!r.active} onCheckedChange={() => toggle(r)} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No prompts registered.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================ */
/* Models                                                       */
/* ============================================================ */
function ModelsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from('ai_models').select('*').order('purpose').then(({ data }) => setRows(data ?? []));
  useEffect(() => { void load(); }, []);
  const toggle = async (r: any) => {
    const { error } = await supabase.from('ai_models').update({ active: !r.active }).eq('id', r.id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    void load();
  };
  return (
    <Card className="p-4 border-2">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th>Purpose</th><th>Vendor</th><th>Model</th><th>Version</th><th>Active</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-1 font-mono">{r.purpose}</td>
              <td>{r.vendor}</td><td className="font-mono">{r.model_id}</td><td>{r.version}</td>
              <td><Switch checked={!!r.active} onCheckedChange={() => toggle(r)} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No models registered.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

/* ============================================================ */
/* Performance                                                  */
/* ============================================================ */
function PerformanceTab() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('perf_budgets').select('*').eq('active', true).then(({ data }) => setBudgets(data ?? []));
    supabase.from('perf_events').select('*').order('created_at', { ascending: false }).limit(5000)
      .then(({ data }) => setEvents(data ?? []));
  }, []);
  const stats = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const e of events) { (map[e.name] ??= []).push(e.duration_ms ?? 0); }
    const pct = (arr: number[], p: number) => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
    };
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, {
      count: v.length, p50: pct(v, 50), p90: pct(v, 90), p95: pct(v, 95), p99: pct(v, 99),
    }]));
  }, [events]);
  const status = (actual: number, budget: number) =>
    !budget ? 'neutral' : actual <= budget ? 'ok' : actual <= budget * 1.5 ? 'warn' : 'bad';
  const color: Record<string, string> = { ok: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', warn: 'bg-amber-500/20 text-amber-700 dark:text-amber-300', bad: 'bg-red-500/20 text-red-700 dark:text-red-300', neutral: 'bg-muted' };
  return (
    <Card className="p-4 border-2 overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="text-left text-muted-foreground">
          <tr><th>Subsystem</th><th>Events</th><th>p50</th><th>p90</th><th>p95</th><th>p99</th><th>Budget p95</th></tr>
        </thead>
        <tbody>
          {budgets.map((b) => {
            const s = stats[b.name] ?? { count: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
            const st = status(s.p95, b.p95_ms);
            return (
              <tr key={b.id} className="border-t">
                <td className="py-1 font-mono">{b.name}</td>
                <td>{s.count}</td>
                <td>{s.p50} ms</td><td>{s.p90} ms</td>
                <td><span className={`px-2 py-0.5 rounded ${color[st]}`}>{s.p95} ms</span></td>
                <td>{s.p99} ms</td>
                <td className="text-muted-foreground">{b.p95_ms} ms</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ============================================================ */
/* Experiments                                                  */
/* ============================================================ */
function ExperimentsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from('experiments').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { void load(); }, []);
  const toggle = async (r: any) => {
    await supabase.from('experiments').update({ is_active: !r.is_active }).eq('id', r.id);
    void load();
  };
  return (
    <Card className="p-4 border-2">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th>Name</th><th>Variants</th><th>Traffic %</th><th>Active</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t align-top">
              <td className="py-1"><div className="font-mono">{r.name}</div><div className="text-xs text-muted-foreground">{r.description}</div></td>
              <td className="font-mono text-xs">{Array.isArray(r.variants) ? r.variants.join(', ') : JSON.stringify(r.variants)}</td>
              <td>{r.traffic_percent}%</td>
              <td><Switch checked={!!r.is_active} onCheckedChange={() => toggle(r)} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No experiments defined.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

/* ============================================================ */
/* Events                                                       */
/* ============================================================ */
function EventsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const load = async () => {
    let query = supabase.from('event_log').select('*').order('created_at', { ascending: false }).limit(300);
    if (kindFilter !== 'all') query = query.eq('kind', kindFilter);
    const { data } = await query;
    setRows(data ?? []);
  };
  useEffect(() => { void load(); }, [kindFilter]);
  const kinds = useMemo(() => Array.from(new Set(rows.map((r) => r.kind))).sort(), [rows]);
  const filtered = rows.filter((r) => !q || JSON.stringify(r.payload).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-48 border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-sm border-2" placeholder="Search payload…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => load()}>Refresh</Button>
      </div>
      <Card className="p-4 border-2 overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="text-left text-muted-foreground">
            <tr><th>When</th><th>Kind</th><th>Session</th><th>Payload</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td><Badge variant="outline">{r.kind}</Badge></td>
                <td className="font-mono">{r.session_id?.slice(0, 8) ?? '—'}</td>
                <td className="font-mono truncate max-w-[380px]" title={JSON.stringify(r.payload)}>{JSON.stringify(r.payload)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No events.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================ */
/* Safety                                                       */
/* ============================================================ */
function SafetyTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState('all');
  useEffect(() => {
    let q = supabase.from('safety_incidents').select('*').order('created_at', { ascending: false }).limit(300);
    if (kind !== 'all') q = q.eq('kind', kind);
    q.then(({ data }) => setRows(data ?? []));
  }, [kind]);
  const kinds = ['all', 'prompt_injection', 'jailbreak', 'toxic', 'pii', 'other'];
  const verdictColor: Record<string, string> = { block: 'bg-red-500/20', flag: 'bg-amber-500/20', allow: 'bg-emerald-500/20' };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Label>Kind</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48 border-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="p-4 border-2 overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="text-left text-muted-foreground">
            <tr><th>When</th><th>Kind</th><th>Verdict</th><th>Reason</th><th>Session</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.kind}</td>
                <td><span className={`px-2 py-0.5 rounded ${verdictColor[r.verdict] ?? 'bg-muted'}`}>{r.verdict}</span></td>
                <td className="max-w-[380px] truncate" title={r.reason}>{r.reason}</td>
                <td className="font-mono">{r.session_id?.slice(0, 8) ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No safety incidents.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================================================ */
/* Shared UI                                                    */
/* ============================================================ */
function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4 border-2">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

/* ============================================================ */
/* Page                                                         */
/* ============================================================ */
export default function Governance() {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-4 border-border p-4">
        <div className="container mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold">GOVERNANCE</h1>
          <p className="text-sm text-muted-foreground">Track 9 · Slice 5 — AI cost, prompts, models, performance, experiments, events, safety.</p>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="costs" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="costs"><DollarSign className="w-4 h-4 mr-1" />Costs</TabsTrigger>
            <TabsTrigger value="prompts"><MessageSquareCode className="w-4 h-4 mr-1" />Prompts</TabsTrigger>
            <TabsTrigger value="models"><Cpu className="w-4 h-4 mr-1" />Models</TabsTrigger>
            <TabsTrigger value="perf"><Activity className="w-4 h-4 mr-1" />Performance</TabsTrigger>
            <TabsTrigger value="exp"><FlaskConical className="w-4 h-4 mr-1" />Experiments</TabsTrigger>
            <TabsTrigger value="events"><ListTree className="w-4 h-4 mr-1" />Events</TabsTrigger>
            <TabsTrigger value="safety"><Shield className="w-4 h-4 mr-1" />Safety</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="costs"><CostsTab /></TabsContent>
            <TabsContent value="prompts"><PromptsTab /></TabsContent>
            <TabsContent value="models"><ModelsTab /></TabsContent>
            <TabsContent value="perf"><PerformanceTab /></TabsContent>
            <TabsContent value="exp"><ExperimentsTab /></TabsContent>
            <TabsContent value="events"><EventsTab /></TabsContent>
            <TabsContent value="safety"><SafetyTab /></TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
