import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Smartphone, Monitor, Globe, ShieldCheck, ShieldAlert } from "lucide-react";

interface Row {
  id: string;
  created_at: string;
  event_type: string;
  kind: string;
  target: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  verified: boolean;
  ref: string | null;
}

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" } as const;
type RangeKey = keyof typeof RANGES;

export default function AdminShareDrilldown() {
  const { target = "generic" } = useParams();
  const [sp, setSp] = useSearchParams();
  const range = (sp.get("range") as RangeKey) ?? "30";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const days = parseInt(range, 10) || 30;
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const { data, error } = await supabase
          .from("share_events")
          .select("id, created_at, event_type, kind, target, device, browser, os, country, verified, ref")
          .eq("target", target)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target, range]);

  const stats = useMemo(() => {
    const shares = rows.filter((r) => r.event_type === "share").length;
    const installs = rows.filter((r) => r.event_type === "install").length;
    const joins = rows.filter((r) => r.event_type === "join").length;
    const verified = rows.filter((r) => r.verified).length;
    const spoofed = rows.filter((r) => r.event_type !== "share" && !r.verified).length;

    const bucket = (rs: Row[], key: "device" | "browser" | "os" | "country") => {
      const m = new Map<string, { s: number; i: number; j: number }>();
      for (const r of rs) {
        const k = (r[key] || "unknown") as string;
        const cur = m.get(k) ?? { s: 0, i: 0, j: 0 };
        if (r.event_type === "share") cur.s += 1;
        else if (r.event_type === "install") cur.i += 1;
        else if (r.event_type === "join") cur.j += 1;
        m.set(k, cur);
      }
      return [...m.entries()]
        .map(([k, v]) => ({ k, ...v, total: v.s + v.i + v.j }))
        .sort((a, b) => b.total - a.total);
    };

    return {
      shares, installs, joins, verified, spoofed,
      byDevice: bucket(rows, "device"),
      byBrowser: bucket(rows, "browser"),
      byOS: bucket(rows, "os"),
      byCountry: bucket(rows, "country"),
    };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/home/admin/shares" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Share analytics
          </Link>
          <h1 className="text-2xl font-bold mt-1 capitalize">Share drill-down · {target}</h1>
          <p className="text-sm text-muted-foreground">
            Devices, browsers and geo attributed to <span className="font-mono">{target}</span>.
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(v) => setSp((p) => { p.set("range", v); return p; })}
        >
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RANGES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </header>

      {error && (
        <Card className="p-4 border-destructive/40">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Shares" value={stats.shares} />
        <Stat label="Installs" value={stats.installs} />
        <Stat label="Joins" value={stats.joins} />
        <Stat label="Verified" value={stats.verified} icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />} />
        <Stat label="Unverified conv." value={stats.spoofed} icon={<ShieldAlert className="w-4 h-4 text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Breakdown title="By device" icon={<Smartphone className="w-4 h-4" />} rows={stats.byDevice} loading={loading} />
        <Breakdown title="By browser" icon={<Monitor className="w-4 h-4" />} rows={stats.byBrowser} loading={loading} />
        <Breakdown title="By OS" icon={<Monitor className="w-4 h-4" />} rows={stats.byOS} loading={loading} />
        <Breakdown title="By country" icon={<Globe className="w-4 h-4" />} rows={stats.byCountry} loading={loading} />
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Recent events</h2>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-mono">{r.event_type}</TableCell>
                    <TableCell className="text-xs">{r.device ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.browser ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.os ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.country ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[120px]">{r.ref ?? "—"}</TableCell>
                    <TableCell>
                      {r.verified
                        ? <span className="text-emerald-600 text-xs font-semibold">✓</span>
                        : <span className="text-amber-600 text-xs font-semibold">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
    </Card>
  );
}

function Breakdown({
  title, icon, rows, loading,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { k: string; s: number; i: number; j: number; total: number }[];
  loading: boolean;
}) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">{icon} {title}</h3>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segment</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Installs</TableHead>
              <TableHead className="text-right">Joins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 8).map((r) => (
              <TableRow key={r.k}>
                <TableCell className="capitalize">{r.k}</TableCell>
                <TableCell className="text-right tabular-nums">{r.s}</TableCell>
                <TableCell className="text-right tabular-nums">{r.i}</TableCell>
                <TableCell className="text-right tabular-nums">{r.j}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
