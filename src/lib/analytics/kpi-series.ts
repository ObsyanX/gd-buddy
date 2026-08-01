// Accurate KPI time-series helpers for the admin analytics drill-downs.
// Every series is derived from real rows in the database — no mock data.
// Reads are paginated (PostgREST caps a single response at 1000 rows) so
// totals and distinct counts stay exact even on large tables.
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";

export type KpiFilter = [column: string, value: string | number | boolean | null];

export interface KpiSpec {
  /** Human title shown in the drill-down. */
  title: string;
  table: string;
  /** Timestamp column used for daily bucketing. */
  dateField: string;
  /** Equality filters applied to every query. */
  eq?: KpiFilter[];
  /** `is not null` filters. */
  notNull?: string[];
  /** Count distinct values of this column instead of counting rows. */
  distinctField?: string;
  /** Average this numeric column instead of counting rows. */
  avgField?: string;
  /** Sum these numeric columns instead of counting rows. */
  sumFields?: string[];
  /**
   * Derived metrics that cannot be expressed as a single column:
   * - `session_seconds`: average of (last_seen - first_seen) per visitor session
   * - `bounce_rate`: % of sessions with a single page view
   */
  computed?: "session_seconds" | "bounce_rate";
  /** Optional route for the full detail page. */
  href?: string;
  /** Unit suffix for display. */
  unit?: string;
  /** Rounding precision for computed values. */
  precision?: number;
}

export interface KpiPoint {
  day: string; // yyyy-MM-dd
  label: string; // "MMM d"
  value: number;
}

export interface KpiSeriesResult {
  points: KpiPoint[];
  total: number;
  previousTotal: number;
  growthPct: number | null;
  avgPerDay: number;
  best: KpiPoint | null;
  isAverage: boolean;
  unit?: string;
}

const PAGE = 1000;
const MAX_ROWS = 50_000;

type Row = Record<string, unknown>;

function applyFilters<T>(q: T, spec: KpiSpec): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = q;
  spec.eq?.forEach(([col, val]) => { query = query.eq(col, val); });
  spec.notNull?.forEach((col) => { query = query.not(col, "is", null); });
  return query as T;
}

/** Paginated select of every row in the window. */
async function fetchRows(spec: KpiSpec, fromISO: string, toISO: string): Promise<Row[]> {
  const cols = [
    spec.dateField,
    spec.distinctField,
    spec.avgField,
    ...(spec.sumFields ?? []),
    ...(spec.computed === "session_seconds" ? ["first_seen", "last_seen"] : []),
    ...(spec.computed === "bounce_rate" ? ["page_count"] : []),
  ].filter(Boolean).join(",");

  const out: Row[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(spec.table as never).select(cols)
      .gte(spec.dateField, fromISO)
      .lt(spec.dateField, toISO)
      .order(spec.dateField, { ascending: true })
      .range(offset, offset + PAGE - 1);
    q = applyFilters(q, spec);
    const { data, error } = await q;
    if (error) {
      console.error(`[kpi-series] ${spec.table} fetch failed`, error);
      break;
    }
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

function reduceRows(spec: KpiSpec, rows: Row[]): number {
  if (spec.computed === "session_seconds") {
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + Math.max(
      0,
      (new Date(String(r.last_seen)).getTime() - new Date(String(r.first_seen)).getTime()) / 1000,
    ), 0) / rows.length;
  }
  if (spec.computed === "bounce_rate") {
    if (!rows.length) return 0;
    const bounced = rows.filter((r) => Number(r.page_count ?? 1) <= 1).length;
    return (bounced / rows.length) * 100;
  }
  if (spec.distinctField) {
    return new Set(rows.map((r) => String(r[spec.distinctField!] ?? ""))).size;
  }
  if (spec.avgField) {
    const vals = rows.map((r) => Number(r[spec.avgField!] ?? 0)).filter((v) => Number.isFinite(v));
    if (!vals.length) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  if (spec.sumFields?.length) {
    return rows.reduce((s, r) => s + spec.sumFields!.reduce((t, f) => t + Number(r[f] ?? 0), 0), 0);
  }
  return rows.length;
}

function round(v: number, precision = 0) {
  const p = 10 ** precision;
  return Math.round(v * p) / p;
}

/** Build an exact daily series for the last `days` days plus previous-period comparison. */
export async function loadKpiSeries(spec: KpiSpec, days: number): Promise<KpiSeriesResult> {
  const now = new Date();
  const start = startOfDay(subDays(now, days - 1));
  const prevStart = startOfDay(subDays(now, days * 2 - 1));
  const toISO = new Date(now.getTime() + 60_000).toISOString();

  const [rows, prevRows] = await Promise.all([
    fetchRows(spec, start.toISOString(), toISO),
    fetchRows(spec, prevStart.toISOString(), start.toISOString()),
  ]);

  const buckets = new Map<string, Row[]>();
  rows.forEach((r) => {
    const raw = r[spec.dateField];
    if (!raw) return;
    const key = format(new Date(String(raw)), "yyyy-MM-dd");
    const arr = buckets.get(key);
    if (arr) arr.push(r); else buckets.set(key, [r]);
  });

  const precision = spec.precision ?? (spec.avgField || spec.computed ? 1 : 0);
  const points: KpiPoint[] = Array.from({ length: days }, (_, i) => {
    const d = subDays(now, days - 1 - i);
    const key = format(d, "yyyy-MM-dd");
    return {
      day: key,
      label: format(d, "MMM d"),
      value: round(reduceRows(spec, buckets.get(key) ?? []), precision),
    };
  });

  const total = round(reduceRows(spec, rows), precision);
  const previousTotal = round(reduceRows(spec, prevRows), precision);
  const growthPct = previousTotal > 0
    ? round(((total - previousTotal) / previousTotal) * 100, 1)
    : total > 0 ? null : 0;

  const best = points.reduce<KpiPoint | null>(
    (b, p) => (b === null || p.value > b.value ? p : b),
    null,
  );

  return {
    points,
    total,
    previousTotal,
    growthPct,
    avgPerDay: round(total / days, spec.avgField || spec.computed ? 1 : 2),
    best,
    isAverage: Boolean(spec.avgField || spec.computed),
    unit: spec.unit,
  };
}

/** Exact all-time count (or distinct count) for a KPI, independent of the window. */
export async function loadKpiTotal(spec: KpiSpec): Promise<number> {
  if (spec.distinctField || spec.avgField || spec.sumFields?.length) {
    const rows = await fetchRows(spec, new Date(0).toISOString(), new Date(Date.now() + 60_000).toISOString());
    return round(reduceRows(spec, rows), spec.precision ?? (spec.avgField ? 1 : 0));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(spec.table as never).select("*", { count: "exact", head: true });
  q = applyFilters(q, spec);
  const { count, error } = await q;
  if (error) {
    console.error(`[kpi-series] ${spec.table} count failed`, error);
    return 0;
  }
  return count ?? 0;
}

/** Registry of every drill-down-enabled KPI on the analytics page. */
export const KPI_SPECS = {
  dau: { title: "Daily active users", table: "visitor_sessions", dateField: "last_seen", notNull: ["user_id"], distinctField: "user_id", href: "/home/admin/users?active=1d" },
  wau: { title: "Weekly active users", table: "visitor_sessions", dateField: "last_seen", notNull: ["user_id"], distinctField: "user_id", href: "/home/admin/users?active=7d" },
  mau: { title: "Monthly active users", table: "visitor_sessions", dateField: "last_seen", notNull: ["user_id"], distinctField: "user_id", href: "/home/admin/users?active=30d" },

  totalLogins: { title: "Logins", table: "login_events", dateField: "created_at", href: "/home/admin/auth-errors" },
  successLogins: { title: "Successful logins", table: "login_events", dateField: "created_at", eq: [["success", true]], href: "/home/admin/auth-errors?status=success" },
  failedLogins: { title: "Failed logins", table: "login_events", dateField: "created_at", eq: [["success", false]], href: "/home/admin/auth-errors?status=failed" },

  totalVisitors: { title: "Visitor sessions", table: "visitor_sessions", dateField: "first_seen", href: "/home/admin/performance" },
  uniqueVisitors: { title: "Unique visitors", table: "visitor_sessions", dateField: "first_seen", distinctField: "visitor_id", href: "/home/admin/performance" },
  pageViews: { title: "Page views", table: "page_views", dateField: "created_at", href: "/home/admin/performance" },
  avgSession: { title: "Avg session duration", table: "visitor_sessions", dateField: "first_seen", computed: "session_seconds", unit: "s", href: "/home/admin/performance" },
  bounceRate: { title: "Bounce rate", table: "visitor_sessions", dateField: "first_seen", computed: "bounce_rate", unit: "%", href: "/home/admin/performance" },
  pagesPerSession: { title: "Pages per session", table: "visitor_sessions", dateField: "first_seen", avgField: "page_count", precision: 2, href: "/home/admin/performance" },

  avgAiScore: { title: "Average AI content score", table: "gd_metrics", dateField: "created_at", avgField: "content_score", href: "/home/admin/sessions" },
  aiEvaluations: { title: "AI evaluations", table: "ai_costs", dateField: "created_at", href: "/home/admin/intelligence" },

  activeAds: { title: "Ad impressions (active ads)", table: "ad_impressions", dateField: "created_at", href: "/home/admin/ads?status=active" },
  adImpressions: { title: "Ad impressions", table: "ad_impressions", dateField: "created_at", href: "/home/admin/ads" },
  adClicks: { title: "Ad clicks", table: "ad_clicks", dateField: "created_at", href: "/home/admin/ads" },

  aiRequests: { title: "AI requests", table: "ai_costs", dateField: "created_at", href: "/home/admin/intelligence" },
  tokenUsage: { title: "Token usage", table: "token_usage", dateField: "created_at", sumFields: ["input_tokens", "output_tokens"], href: "/home/admin/intelligence" },
  apiErrors: { title: "API errors", table: "error_logs", dateField: "created_at", href: "/home/admin/edge-errors" },
} satisfies Record<string, KpiSpec>;

export type KpiKey = keyof typeof KPI_SPECS;

/**
 * Paginated select of an entire table (or window) so aggregates are exact
 * instead of being silently truncated at PostgREST's 1000-row response cap.
 */
export async function fetchAllPaginated<T = Record<string, unknown>>(
  table: string,
  columns: string,
  opts: { orderBy?: string; gte?: [string, string] } = {},
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(table as never).select(columns).range(offset, offset + PAGE - 1);
    if (opts.orderBy) q = q.order(opts.orderBy, { ascending: true });
    if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
    const { data, error } = await q;
    if (error) {
      console.error(`[kpi-series] paginated ${table} failed`, error);
      break;
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
