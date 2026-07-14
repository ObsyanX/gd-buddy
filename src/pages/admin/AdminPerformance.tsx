import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Gauge, Activity } from "lucide-react";

const AUDIT_URL = "https://gd-buddy.vercel.app/";

type PSReport = {
  id: string;
  strategy: "mobile" | "desktop";
  performance_score: number | null;
  lcp_ms: number | null;
  inp_ms: number | null;
  cls: number | null;
  fcp_ms: number | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  si_ms: number | null;
  created_at: string;
  source: string;
};

type VitalRow = {
  metric: string;
  value: number;
  device: string | null;
  adsense_loaded: boolean;
  created_at: string;
};

function fmtMs(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
}
function fmtScore(v: number | null | undefined) {
  if (v == null) return "—";
  return Math.round(v * 100).toString();
}
function scoreColor(s: number | null | undefined) {
  if (s == null) return "bg-muted text-muted-foreground";
  const n = s * 100;
  if (n >= 90) return "bg-emerald-500/15 text-emerald-500";
  if (n >= 50) return "bg-amber-500/15 text-amber-500";
  return "bg-red-500/15 text-red-500";
}

function p75(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.75)];
}

export default function AdminPerformance() {
  const [running, setRunning] = useState(false);
  const [reports, setReports] = useState<PSReport[]>([]);
  const [vitals, setVitals] = useState<VitalRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase
        .from("pagespeed_reports")
        .select("id,strategy,performance_score,lcp_ms,inp_ms,cls,fcp_ms,tbt_ms,ttfb_ms,si_ms,created_at,source")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("web_vitals_events")
        .select("metric,value,device,adsense_loaded,created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    setReports((r as PSReport[]) || []);
    setVitals((v as VitalRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runAudit() {
    setRunning(true);
    toast.info("Running PageSpeed audit — this takes ~30s");
    try {
      const { data, error } = await supabase.functions.invoke("pagespeed-audit", {
        body: { url: AUDIT_URL },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Audit complete");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  }

  const latestMobile = reports.find((r) => r.strategy === "mobile");
  const latestDesktop = reports.find((r) => r.strategy === "desktop");

  const rumSummary = useMemo(() => {
    const bucket = (metric: string, ads: boolean) =>
      vitals.filter((r) => r.metric === metric && r.adsense_loaded === ads).map((r) => r.value);
    return {
      lcp_no: p75(bucket("LCP", false)),
      lcp_yes: p75(bucket("LCP", true)),
      inp_no: p75(bucket("INP", false)),
      inp_yes: p75(bucket("INP", true)),
      cls_no: p75(bucket("CLS", false)),
      cls_yes: p75(bucket("CLS", true)),
      samples: vitals.length,
    };
  }, [vitals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Performance</h1>
          <p className="text-sm text-muted-foreground">
            Live PageSpeed & real-user metrics for{" "}
            <a href={AUDIT_URL} target="_blank" rel="noreferrer" className="underline">{AUDIT_URL}</a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gauge className="h-4 w-4 mr-2" />}
            {running ? "Auditing…" : "Run PageSpeed audit"}
          </Button>
        </div>
      </div>

      {/* PageSpeed cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {(["mobile", "desktop"] as const).map((s) => {
          const r = s === "mobile" ? latestMobile : latestDesktop;
          return (
            <Card key={s} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium capitalize">{s}</h2>
                </div>
                <Badge className={scoreColor(r?.performance_score)}>
                  Score {fmtScore(r?.performance_score)}
                </Badge>
              </div>
              {!r ? (
                <p className="text-sm text-muted-foreground">No audit yet — run one above.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="LCP" value={fmtMs(r.lcp_ms)} />
                    <Metric label="INP / TTI" value={fmtMs(r.inp_ms)} />
                    <Metric label="CLS" value={r.cls == null ? "—" : r.cls.toFixed(3)} />
                    <Metric label="FCP" value={fmtMs(r.fcp_ms)} />
                    <Metric label="TBT" value={fmtMs(r.tbt_ms)} />
                    <Metric label="Speed Index" value={fmtMs(r.si_ms)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(r.created_at).toLocaleString()} · {r.source}
                  </p>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* RUM breakdown */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium">Real users (p75, last 7 days)</h2>
          <Badge variant="secondary" className="ml-auto">{rumSummary.samples} samples</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">Metric</th>
                <th className="text-right py-2">AdSense not loaded</th>
                <th className="text-right py-2">AdSense loaded</th>
                <th className="text-right py-2">Delta</th>
              </tr>
            </thead>
            <tbody>
              <RumRow label="LCP" a={rumSummary.lcp_no} b={rumSummary.lcp_yes} unit="ms" />
              <RumRow label="INP" a={rumSummary.inp_no} b={rumSummary.inp_yes} unit="ms" />
              <RumRow label="CLS" a={rumSummary.cls_no} b={rumSummary.cls_yes} unit="cls" />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Populates as visitors browse the site. Compare the two columns to see how deferring AdSense impacts real users.
        </p>
      </Card>

      {/* Audit history */}
      <Card className="p-5">
        <h2 className="font-medium mb-3">Audit history</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">When</th>
                <th className="text-left py-2">Strategy</th>
                <th className="text-right py-2">Score</th>
                <th className="text-right py-2">LCP</th>
                <th className="text-right py-2">CLS</th>
                <th className="text-right py-2">TBT</th>
                <th className="text-left py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 capitalize">{r.strategy}</td>
                  <td className="py-2 text-right">{fmtScore(r.performance_score)}</td>
                  <td className="py-2 text-right">{fmtMs(r.lcp_ms)}</td>
                  <td className="py-2 text-right">{r.cls == null ? "—" : r.cls.toFixed(3)}</td>
                  <td className="py-2 text-right">{fmtMs(r.tbt_ms)}</td>
                  <td className="py-2 text-muted-foreground">{r.source}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">No audits yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function RumRow({ label, a, b, unit }: { label: string; a: number | null; b: number | null; unit: "ms" | "cls" }) {
  const fmt = (v: number | null) =>
    v == null ? "—" : unit === "ms" ? (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`) : v.toFixed(3);
  const delta = a != null && b != null ? b - a : null;
  const deltaStr = delta == null ? "—" : unit === "ms" ? `${delta > 0 ? "+" : ""}${Math.round(delta)} ms` : `${delta > 0 ? "+" : ""}${delta.toFixed(3)}`;
  const cls = delta == null ? "" : delta > 0 ? "text-red-500" : "text-emerald-500";
  return (
    <tr className="border-t border-border">
      <td className="py-2 font-medium">{label}</td>
      <td className="py-2 text-right">{fmt(a)}</td>
      <td className="py-2 text-right">{fmt(b)}</td>
      <td className={`py-2 text-right ${cls}`}>{deltaStr}</td>
    </tr>
  );
}
