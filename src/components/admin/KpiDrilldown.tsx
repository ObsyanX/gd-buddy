import * as React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, defs as _defs,
} from "recharts";
import { KPI_SPECS, loadKpiSeries, type KpiKey, type KpiPoint } from "@/lib/analytics/kpi-series";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

export interface KpiDrilldownProps {
  kpi: KpiKey | null;
  /** Ratio KPIs (e.g. CTR) computed from two underlying series. */
  ratio?: { numerator: KpiKey; denominator: KpiKey; title: string; href?: string } | null;
  onOpenChange: (open: boolean) => void;
}

interface State {
  points: KpiPoint[];
  total: number;
  previousTotal: number;
  growthPct: number | null;
  avgPerDay: number;
  best: KpiPoint | null;
  isAverage: boolean;
  unit?: string;
}

export function KpiDrilldown({ kpi, ratio, onOpenChange }: KpiDrilldownProps) {
  const [range, setRange] = React.useState<Range>(30);
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState<State | null>(null);

  const open = Boolean(kpi || ratio);
  const spec = kpi ? KPI_SPECS[kpi] : null;
  const title = ratio?.title ?? spec?.title ?? "";
  const href = ratio?.href ?? spec?.href;

  React.useEffect(() => {
    if (!open) { setState(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (ratio) {
          const [num, den] = await Promise.all([
            loadKpiSeries(KPI_SPECS[ratio.numerator], range),
            loadKpiSeries(KPI_SPECS[ratio.denominator], range),
          ]);
          const points = num.points.map((p, i) => {
            const d = den.points[i]?.value ?? 0;
            return { ...p, value: d > 0 ? Math.round((p.value / d) * 10000) / 100 : 0 };
          });
          const total = den.total > 0 ? Math.round((num.total / den.total) * 10000) / 100 : 0;
          const prev = den.previousTotal > 0 ? Math.round((num.previousTotal / den.previousTotal) * 10000) / 100 : 0;
          if (cancelled) return;
          setState({
            points, total, previousTotal: prev,
            growthPct: prev > 0 ? Math.round(((total - prev) / prev) * 1000) / 10 : null,
            avgPerDay: total,
            best: points.reduce<KpiPoint | null>((b, p) => (b === null || p.value > b.value ? p : b), null),
            isAverage: true, unit: "%",
          });
        } else if (spec) {
          const res = await loadKpiSeries(spec, range);
          if (cancelled) return;
          setState(res);
        }
      } catch (e) {
        console.error("[kpi-drilldown] load failed", e);
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, kpi, range, ratio?.numerator, ratio?.denominator]); // eslint-disable-line react-hooks/exhaustive-deps

  const growth = state?.growthPct;
  const GrowthIcon = growth == null || growth === 0 ? Minus : growth > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Daily values from live production data — last {range} days.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
          {href && (
            <Button asChild size="sm" variant="ghost" className="ml-auto">
              <Link to={href} onClick={() => onOpenChange(false)}>
                Open detail page <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {loading && <div className="h-64 rounded-xl bg-muted/30 animate-pulse" />}

        {!loading && state && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label={state.isAverage ? "Average" : "Total"} value={fmt(state.total, state.unit)} />
              <Metric label="Prev. period" value={fmt(state.previousTotal, state.unit)} />
              <Metric
                label="Change"
                value={growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth}%`}
                className={cn(
                  growth == null || growth === 0 ? "text-muted-foreground"
                    : growth > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]",
                )}
                icon={<GrowthIcon className="h-3.5 w-3.5" />}
              />
              <Metric
                label={state.isAverage ? "Peak day" : "Avg / day"}
                value={state.isAverage
                  ? `${fmt(state.best?.value ?? 0, state.unit)}`
                  : fmt(state.avgPerDay)}
                hint={state.isAverage ? state.best?.label : undefined}
              />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={state.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kpi-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" fontSize={10} interval={Math.max(0, Math.floor(state.points.length / 6))} />
                  <YAxis fontSize={10} width={44} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => [fmt(Number(v), state.unit), title]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#kpi-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {state.total === 0 && (
              <p className="text-xs text-muted-foreground">
                No events recorded in this window. This metric reflects real tracked activity only.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function fmt(v: number, unit?: string) {
  const n = Number.isFinite(v) ? v : 0;
  const s = Math.abs(n) >= 1000 ? n.toLocaleString() : String(Math.round(n * 100) / 100);
  return unit ? `${s}${unit === "%" ? "%" : ` ${unit}`}` : s;
}

function Metric({ label, value, className, icon, hint }: {
  label: string; value: string; className?: string; icon?: React.ReactNode; hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1 text-lg font-semibold tabular-nums", className)}>
        {icon}{value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
