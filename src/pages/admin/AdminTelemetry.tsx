import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { publishFeatureFlag } from "@/hooks/useFeatureFlag";
import { Activity, AlertTriangle, Database, Loader2, RefreshCw, ShieldCheck, Timer } from "lucide-react";

type PruneRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  dry_run: boolean;
  skipped: boolean;
  triggered_by: string;
  affected: Record<string, number>;
  total_rows: number;
  error_message: string | null;
};

type Volume = { table_name: string; row_estimate: number; total_bytes: number };

type SamplingCheck = {
  id: string;
  window_start: string;
  window_end: string;
  metric: string;
  n_all: number;
  n_sampled: number;
  p75_all: number | null;
  p75_sampled: number | null;
  delta_pct: number | null;
};

const FLAGS = {
  pruneEnabled: "telemetry.prune_enabled",
  pruneDryRun: "telemetry.prune_dry_run",
  samplingEnabled: "telemetry.rum_sampling_enabled",
  sampleRate: "telemetry.rum_sample_rate",
  calibrationUntil: "telemetry.rum_calibration_until",
  maxPruneMs: "telemetry.alert_max_prune_ms",
  maxRows24h: "telemetry.alert_max_rows_24h",
  maxErrorRate: "telemetry.alert_max_error_rate",
} as const;

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

export default function AdminTelemetry() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [runs, setRuns] = useState<PruneRun[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [checks, setChecks] = useState<SamplingCheck[]>([]);
  const [vitals24h, setVitals24h] = useState(0);
  const [errors24h, setErrors24h] = useState(0);
  const [views24h, setViews24h] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<Record<string, any>>({});

  const since = () => new Date(Date.now() - 24 * 3600_000).toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, v, c, wv, el, pv, st] = await Promise.all([
        supabase.from("telemetry_prune_runs").select("*").order("started_at", { ascending: false }).limit(20),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc("telemetry_table_volumes"),
        supabase.from("rum_sampling_checks").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("web_vitals_events").select("*", { count: "exact", head: true }).gte("created_at", since()),
        supabase.from("error_logs").select("*", { count: "exact", head: true }).gte("created_at", since()),
        supabase.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", since()),
        supabase.from("admin_settings").select("key,value"),
      ]);
      setRuns((r.data as unknown as PruneRun[]) || []);
      setVolumes((v?.data as Volume[]) || []);
      setChecks((c.data as unknown as SamplingCheck[]) || []);
      setVitals24h(wv.count || 0);
      setErrors24h(el.count || 0);
      setViews24h(pv.count || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: Record<string, any> = {};
      (st.data || []).forEach((row: { key: string; value: unknown }) => (map[row.key] = row.value));
      setSettings(map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load telemetry monitoring");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveFlag(key: string, value: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("admin_settings") as any).upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSettings((s) => ({ ...s, [key]: value }));
    publishFeatureFlag(key, value);
    toast.success("Saved");
  }

  async function dryRun() {
    setBusy("dry");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("telemetry_prune_dry_run");
      if (error) throw error;
      toast.success(`Dry run: ${data?.total_rows ?? 0} rows would be pruned`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dry run failed");
    } finally {
      setBusy(null);
    }
  }

  async function samplingCheck() {
    setBusy("check");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("admin_run_rum_sampling_check", { _hours: 168 });
      if (error) throw error;
      toast.success("Sampling comparison recorded");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setBusy(null);
    }
  }

  const maxPruneMs = Number(settings[FLAGS.maxPruneMs] ?? 30000);
  const maxRows = Number(settings[FLAGS.maxRows24h] ?? 20000);
  const maxErrorRate = Number(settings[FLAGS.maxErrorRate] ?? 2);
  const errorRate = views24h > 0 ? (errors24h / views24h) * 100 : 0;
  const lastRun = runs.find((r) => !r.dry_run && !r.skipped);

  const alerts = useMemo(() => {
    const out: { level: "warn" | "crit"; text: string }[] = [];
    if (lastRun?.error_message) out.push({ level: "crit", text: `Last prune failed: ${lastRun.error_message}` });
    if (lastRun?.duration_ms && lastRun.duration_ms > maxPruneMs)
      out.push({ level: "warn", text: `Prune took ${lastRun.duration_ms} ms (budget ${maxPruneMs} ms)` });
    if (vitals24h > maxRows)
      out.push({ level: "warn", text: `${vitals24h} web-vitals rows in 24h (budget ${maxRows})` });
    if (errorRate > maxErrorRate)
      out.push({ level: "crit", text: `Client error rate ${errorRate.toFixed(2)}% (budget ${maxErrorRate}%)` });
    const drift = checks.find((c) => c.delta_pct != null && Math.abs(Number(c.delta_pct)) > 10);
    if (drift)
      out.push({ level: "warn", text: `Sampling drift on ${drift.metric}: ${drift.delta_pct}% vs full population` });
    if (lastRun && Date.now() - new Date(lastRun.started_at).getTime() > 48 * 3600_000)
      out.push({ level: "warn", text: "No prune run in the last 48 hours" });
    return out;
  }, [lastRun, maxPruneMs, maxRows, maxErrorRate, vitals24h, errorRate, checks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Telemetry monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Volume, prune health, sampling accuracy and rollback switches. Never touches user, session or auth data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={dryRun} disabled={busy === "dry"}>
            {busy === "dry" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
            Dry run prune
          </Button>
          <Button size="sm" variant="secondary" onClick={samplingCheck} disabled={busy === "check"}>
            {busy === "check" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            Run sampling check
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium">Alerts</h2>
          <Badge variant="secondary" className="ml-auto">{alerts.length} active</Badge>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> All telemetry budgets within range.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {alerts.map((a, i) => (
              <li
                key={i}
                className={`rounded-md px-3 py-2 ${a.level === "crit" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}
              >
                {a.text}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <div>
            <Label htmlFor="budget-ms" className="text-xs">Prune duration budget (ms)</Label>
            <Input
              id="budget-ms"
              type="number"
              defaultValue={maxPruneMs}
              onBlur={(e) => saveFlag(FLAGS.maxPruneMs, Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="budget-rows" className="text-xs">Web-vitals rows / 24h budget</Label>
            <Input
              id="budget-rows"
              type="number"
              defaultValue={maxRows}
              onBlur={(e) => saveFlag(FLAGS.maxRows24h, Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="budget-err" className="text-xs">Error rate budget (%)</Label>
            <Input
              id="budget-err"
              type="number"
              step="0.1"
              defaultValue={maxErrorRate}
              onBlur={(e) => saveFlag(FLAGS.maxErrorRate, Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      {/* Volume */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Web vitals rows (24h)</div>
          <div className="text-2xl font-semibold">{vitals24h.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Client errors (24h)</div>
          <div className="text-2xl font-semibold">{errors24h.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{errorRate.toFixed(2)}% of {views24h.toLocaleString()} views</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Last prune duration</div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            {lastRun?.duration_ms != null ? `${lastRun.duration_ms} ms` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {lastRun ? `${lastRun.total_rows.toLocaleString()} rows · ${new Date(lastRun.started_at).toLocaleString()}` : "No runs yet"}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-medium mb-3">Telemetry table volume</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">Table</th>
                <th className="text-right py-2">Rows (est.)</th>
                <th className="text-right py-2">Size</th>
              </tr>
            </thead>
            <tbody>
              {volumes.map((v) => (
                <tr key={v.table_name} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">{v.table_name}</td>
                  <td className="py-2 text-right">{Math.round(v.row_estimate).toLocaleString()}</td>
                  <td className="py-2 text-right">{fmtBytes(Number(v.total_bytes))}</td>
                </tr>
              ))}
              {volumes.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Feature flags / rollback */}
      <Card className="p-5">
        <h2 className="font-medium mb-1">Runtime switches & rollback</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Changes take effect on the next page load — no deploy needed. Turning sampling off restores 100% capture;
          turning pruning off stops all deletes immediately.
        </p>
        <div className="space-y-4">
          <ToggleRow
            label="Telemetry pruning enabled"
            hint="Off ⇒ nightly job records a skipped run and deletes nothing."
            checked={settings[FLAGS.pruneEnabled] !== false}
            onChange={(v) => saveFlag(FLAGS.pruneEnabled, v)}
          />
          <ToggleRow
            label="Force dry-run mode (staging validation)"
            hint="On ⇒ the nightly job only counts rows it would delete."
            checked={settings[FLAGS.pruneDryRun] === true}
            onChange={(v) => saveFlag(FLAGS.pruneDryRun, v)}
          />
          <ToggleRow
            label="RUM sampling enabled"
            hint="Off ⇒ every visitor's vitals are recorded (rollback)."
            checked={settings[FLAGS.samplingEnabled] !== false}
            onChange={(v) => saveFlag(FLAGS.samplingEnabled, v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rate" className="text-xs">Sample rate (0–1)</Label>
              <Input
                id="rate"
                type="number"
                step="0.05"
                min={0}
                max={1}
                defaultValue={Number(settings[FLAGS.sampleRate] ?? 0.25)}
                onBlur={(e) => saveFlag(FLAGS.sampleRate, Math.min(1, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <div>
              <Label htmlFor="calib" className="text-xs">Calibration window ends (ISO, blank = off)</Label>
              <Input
                id="calib"
                placeholder="2026-08-17T00:00:00Z"
                defaultValue={typeof settings[FLAGS.calibrationUntil] === "string" ? settings[FLAGS.calibrationUntil] : ""}
                onBlur={(e) => saveFlag(FLAGS.calibrationUntil, e.target.value.trim() || null)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            During a calibration window every event is stored and tagged with the sample decision it would have had, so
            the comparison below measures sampling error directly.
          </p>
        </div>
      </Card>

      {/* Sampling accuracy */}
      <Card className="p-5">
        <h2 className="font-medium mb-3">Sampled vs full population (p75)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">When</th>
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">n all</th>
                <th className="text-right py-2">n sampled</th>
                <th className="text-right py-2">p75 all</th>
                <th className="text-right py-2">p75 sampled</th>
                <th className="text-right py-2">Delta</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2">{new Date(c.window_end).toLocaleDateString()}</td>
                  <td className="py-2 font-medium">{c.metric}</td>
                  <td className="py-2 text-right">{c.n_all}</td>
                  <td className="py-2 text-right">{c.n_sampled}</td>
                  <td className="py-2 text-right">{c.p75_all == null ? "—" : Number(c.p75_all).toFixed(2)}</td>
                  <td className="py-2 text-right">{c.p75_sampled == null ? "—" : Number(c.p75_sampled).toFixed(2)}</td>
                  <td
                    className={`py-2 text-right ${
                      c.delta_pct == null ? "" : Math.abs(Number(c.delta_pct)) > 10 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {c.delta_pct == null ? "—" : `${c.delta_pct}%`}
                  </td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No comparisons yet — run one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Prune history */}
      <Card className="p-5">
        <h2 className="font-medium mb-3">Prune run history</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">Started</th>
                <th className="text-left py-2">Mode</th>
                <th className="text-left py-2">Trigger</th>
                <th className="text-right py-2">Duration</th>
                <th className="text-right py-2">Rows</th>
                <th className="text-left py-2">Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="py-2">
                    <Badge variant={r.skipped ? "outline" : r.dry_run ? "secondary" : "default"}>
                      {r.skipped ? "skipped" : r.dry_run ? "dry run" : "deleted"}
                    </Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">{r.triggered_by}</td>
                  <td className="py-2 text-right">{r.duration_ms == null ? "—" : `${r.duration_ms} ms`}</td>
                  <td className="py-2 text-right">{r.total_rows.toLocaleString()}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {r.error_message
                      ? <span className="text-red-500">{r.error_message}</span>
                      : Object.entries(r.affected || {})
                          .filter(([, n]) => Number(n) > 0)
                          .map(([k, n]) => `${k}: ${n}`)
                          .join(" · ") || "nothing older than thresholds"}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          The prune routine only ever touches an allowlist of nine telemetry tables and aborts if that list ever
          references a session, auth, profile or user-generated table.
        </p>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 px-3 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
