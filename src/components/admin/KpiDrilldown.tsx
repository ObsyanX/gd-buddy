import * as React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpRight, ArrowDownRight, Minus, ExternalLink, CalendarIcon } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  KPI_SPECS, loadKpiSeriesBetween, loadCustomKpiSeries, CUSTOM_KPI_TITLES,
  type KpiKey, type KpiPoint, type CustomKpiKey,
} from "@/lib/analytics/kpi-series";
import { KpiMethodology } from "@/components/admin/KpiMethodology";
import { cn } from "@/lib/utils";

const PRESETS = [7, 30, 90] as const;

export interface KpiDrilldownProps {
  kpi: KpiKey | null;
  /** Ratio KPIs (e.g. CTR) computed from two underlying series. */
  ratio?: { numerator: KpiKey; denominator: KpiKey; title: string; href?: string } | null;
  /** Cross-table KPIs (new / returning users). */
  custom?: CustomKpiKey | null;
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

export function KpiDrilldown({ kpi, ratio, custom, onOpenChange }: KpiDrilldownProps) {
  const [range, setRange] = React.useState<DateRange>(() => ({
    from: startOfDay(subDays(new Date(), 29)),
    to: startOfDay(new Date()),
  }));
  const [loading, setLoading] = React.useState(false);
  const [state, setState] = React.useState<State | null>(null);

  const open = Boolean(kpi || ratio || custom);
  const spec = kpi ? KPI_SPECS[kpi] : null;
  const title = ratio?.title ?? (custom ? CUSTOM_KPI_TITLES[custom].title : spec?.title) ?? "";
  const href = ratio?.href ?? (custom ? CUSTOM_KPI_TITLES[custom].href : spec?.href);

  const from = range.from ?? startOfDay(subDays(new Date(), 29));
  const to = range.to ?? from;
  const dayCount = Math.max(1, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1);
  const fromKey = format(from, "yyyy-MM-dd");
  const toKey = format(to, "yyyy-MM-dd");

  const setPreset = (days: number) =>
    setRange({ from: startOfDay(subDays(new Date(), days - 1)), to: startOfDay(new Date()) });

  const isPreset = (days: number) =>
    fromKey === format(subDays(new Date(), days - 1), "yyyy-MM-dd") &&
    toKey === format(new Date(), "yyyy-MM-dd");

  React.useEffect(() => {
    if (!open) { setState(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (ratio) {
          const [num, den] = await Promise.all([
            loadKpiSeriesBetween(KPI_SPECS[ratio.numerator], from, to),
            loadKpiSeriesBetween(KPI_SPECS[ratio.denominator], from, to),
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
        } else if (custom) {
          const res = await loadCustomKpiSeries(custom, from, to);
          if (!cancelled) setState(res);
        } else if (spec) {
          const res = await loadKpiSeriesBetween(spec, from, to);
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
  }, [open, kpi, custom, fromKey, toKey, ratio?.numerator, ratio?.denominator]); // eslint-disable-line react-hooks/exhaustive-deps

  const growth = state?.growthPct;
  const GrowthIcon = growth == null || growth === 0 ? Minus : growth > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Daily values from live production data — {format(from, "MMM d, yyyy")} to {format(to, "MMM d, yyyy")} ({dayCount} days).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={isPreset(r) ? "default" : "outline"}
              onClick={() => setPreset(r)}
            >
              {r}d
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="font-normal">
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {format(from, "MMM d")} – {format(to, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => r && setRange(r)}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                defaultMonth={from}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <div className="ml-auto flex items-center gap-2">
            <KpiMethodology />
            {href && (
              <Button asChild size="sm" variant="ghost">
                <Link to={href} onClick={() => onOpenChange(false)}>
                  Detail <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
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
