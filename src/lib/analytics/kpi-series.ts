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

const DAY_MS = 86_400_000;

/** Build an exact daily series for the last `days` days plus previous-period comparison. */
export async function loadKpiSeries(spec: KpiSpec, days: number): Promise<KpiSeriesResult> {
  const now = new Date();
  return loadKpiSeriesBetween(spec, startOfDay(subDays(now, days - 1)), now);
}

/** Same as `loadKpiSeries` but for an explicit inclusive calendar-day range. */
export async function loadKpiSeriesBetween(spec: KpiSpec, from: Date, to: Date): Promise<KpiSeriesResult> {
  const start = startOfDay(from);
  const endExclusive = new Date(startOfDay(to).getTime() + DAY_MS);
  const days = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS));
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const toISO = new Date(Math.min(endExclusive.getTime(), Date.now() + 60_000)).toISOString();

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
    const d = new Date(start.getTime() + i * DAY_MS);
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

/* ------------------------------------------------------------------ *
 * Custom (cross-table) series: new vs returning users
 * ------------------------------------------------------------------ */

export type CustomKpiKey = "newUsers" | "returningUsers";

export const CUSTOM_KPI_TITLES: Record<CustomKpiKey, { title: string; href?: string }> = {
  newUsers: { title: "New users", href: "/home/admin/users" },
  returningUsers: { title: "Returning users", href: "/home/admin/users" },
};

interface NewReturning {
  newPoints: KpiPoint[];
  returningPoints: KpiPoint[];
  newTotal: number;
  returningTotal: number;
  prevNewTotal: number;
  prevReturningTotal: number;
}

/**
 * New user (day D)  = profile whose `created_at` falls on D.
 * Returning user(D) = distinct user active on D (visitor_sessions.last_seen)
 *                     whose profile was created strictly before D.
 */
export async function loadNewVsReturning(from: Date, to: Date): Promise<NewReturning> {
  const start = startOfDay(from);
  const endExclusive = new Date(startOfDay(to).getTime() + DAY_MS);
  const days = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS));
  const prevStart = new Date(start.getTime() - days * DAY_MS);

  const [profiles, sessions] = await Promise.all([
    fetchAllPaginated<{ id: string; created_at: string }>(
      "profiles", "id,created_at", { gte: ["created_at", new Date(0).toISOString()] },
    ),
    fetchAllPaginated<{ user_id: string | null; last_seen: string }>(
      "visitor_sessions", "user_id,last_seen", { gte: ["last_seen", prevStart.toISOString()] },
    ),
  ]);

  const createdAt = new Map(profiles.map((p) => [p.id, new Date(p.created_at).getTime()]));

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const newByDay = new Map<string, number>();
  profiles.forEach((p) => {
    const k = dayKey(new Date(p.created_at));
    newByDay.set(k, (newByDay.get(k) ?? 0) + 1);
  });

  const returningByDay = new Map<string, Set<string>>();
  sessions.forEach((s) => {
    if (!s.user_id) return;
    const seen = new Date(s.last_seen);
    const created = createdAt.get(s.user_id);
    if (created === undefined) return;
    if (created >= startOfDay(seen).getTime()) return; // signed up that same day → "new", not returning
    const k = dayKey(seen);
    const set = returningByDay.get(k) ?? new Set<string>();
    set.add(s.user_id);
    returningByDay.set(k, set);
  });

  const build = (offsetStart: Date): KpiPoint[] =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date(offsetStart.getTime() + i * DAY_MS);
      const k = dayKey(d);
      return { day: k, label: format(d, "MMM d"), value: 0, _k: k } as KpiPoint & { _k: string };
    });

  const newPoints = build(start).map((p) => ({ ...p, value: newByDay.get(p.day) ?? 0 }));
  const returningPoints = build(start).map((p) => ({ ...p, value: (returningByDay.get(p.day)?.size ?? 0) }));
  const prevNew = build(prevStart).reduce((s, p) => s + (newByDay.get(p.day) ?? 0), 0);

  const prevReturningUsers = new Set<string>();
  build(prevStart).forEach((p) => returningByDay.get(p.day)?.forEach((u) => prevReturningUsers.add(u)));

  const returningUnique = new Set<string>();
  returningPoints.forEach((p) => returningByDay.get(p.day)?.forEach((u) => returningUnique.add(u)));

  return {
    newPoints,
    returningPoints,
    newTotal: newPoints.reduce((s, p) => s + p.value, 0),
    returningTotal: returningUnique.size,
    prevNewTotal: prevNew,
    prevReturningTotal: prevReturningUsers.size,
  };
}

/** Wrap the new/returning computation into the standard series shape. */
export async function loadCustomKpiSeries(
  key: CustomKpiKey, from: Date, to: Date,
): Promise<KpiSeriesResult> {
  const r = await loadNewVsReturning(from, to);
  const points = key === "newUsers" ? r.newPoints : r.returningPoints;
  const total = key === "newUsers" ? r.newTotal : r.returningTotal;
  const previousTotal = key === "newUsers" ? r.prevNewTotal : r.prevReturningTotal;
  const growthPct = previousTotal > 0
    ? round(((total - previousTotal) / previousTotal) * 100, 1)
    : total > 0 ? null : 0;
  return {
    points,
    total,
    previousTotal,
    growthPct,
    avgPerDay: round(total / Math.max(1, points.length), 2),
    best: points.reduce<KpiPoint | null>((b, p) => (b === null || p.value > b.value ? p : b), null),
    isAverage: false,
  };
}

/* ------------------------------------------------------------------ *
 * Methodology — how every KPI is computed, and from which table.
 * ------------------------------------------------------------------ */

export interface MethodologyEntry {
  title: string;
  source: string;
  formula: string;
  notes?: string;
}

export const KPI_METHODOLOGY: MethodologyEntry[] = [
  { title: "Total users", source: "profiles", formula: "exact row count of profiles (count: 'exact', head: true)" },
  { title: "New users", source: "profiles.created_at", formula: "profiles created inside the selected day / range", notes: "A user counts as new only on their signup day." },
  { title: "Returning users", source: "visitor_sessions.last_seen + profiles.created_at", formula: "distinct user_id active in the range whose profile was created before that day", notes: "Same-day signups are excluded so new and returning never double-count." },
  { title: "DAU / WAU / MAU", source: "visitor_sessions", formula: "COUNT(DISTINCT user_id) where last_seen ≥ now − 1d / 7d / 30d", notes: "Rows are paginated in 1000-row pages so distinct counts are never truncated." },
  { title: "Logins (total / success / failed)", source: "login_events", formula: "row count, optionally filtered by success = true / false" },
  { title: "Total visitors", source: "visitor_sessions", formula: "row count of visitor sessions bucketed by first_seen" },
  { title: "Unique visitors", source: "visitor_sessions.visitor_id", formula: "COUNT(DISTINCT visitor_id)" },
  { title: "Page views", source: "page_views", formula: "exact row count bucketed by created_at" },
  { title: "Avg session (s)", source: "visitor_sessions", formula: "mean of (last_seen − first_seen) in seconds" },
  { title: "Bounce rate %", source: "visitor_sessions.page_count", formula: "sessions with page_count ≤ 1 ÷ all sessions × 100" },
  { title: "Pages / session", source: "visitor_sessions.page_count", formula: "mean of page_count" },
  { title: "GD sessions / Completed", source: "gd_sessions", formula: "row count; completed filters status = 'completed'" },
  { title: "Avg AI score", source: "gd_metrics.content_score", formula: "mean of content_score across all metric rows" },
  { title: "AI evaluations / AI requests", source: "ai_costs", formula: "row count bucketed by created_at" },
  { title: "Token usage", source: "token_usage", formula: "SUM(input_tokens + output_tokens)" },
  { title: "Ad impressions / clicks", source: "ad_impressions, ad_clicks", formula: "row counts bucketed by created_at" },
  { title: "CTR %", source: "ad_clicks ÷ ad_impressions", formula: "daily clicks ÷ daily impressions × 100", notes: "Computed per day from two independent series, not a stored column." },
  { title: "API errors", source: "error_logs", formula: "row count bucketed by created_at" },
];
