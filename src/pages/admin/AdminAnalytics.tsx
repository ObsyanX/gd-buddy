import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid } from "recharts";
import { StatCard, type StatCardProps } from "@/components/charts";
import { format, subDays } from "date-fns";
import { KpiDrilldown } from "@/components/admin/KpiDrilldown";
import { fetchAllPaginated, type KpiKey } from "@/lib/analytics/kpi-series";

/**
 * Local wrapper that automatically attaches tracking metadata (page + filters
 * parsed from the destination href) so every StatCard click is logged for
 * analytics / debugging without repeating boilerplate in the JSX below.
 */
function LinkedStat(props: StatCardProps) {
  const filters: Record<string, string> = {};
  if (props.href && props.href.includes("?")) {
    const qs = props.href.split("?")[1];
    new URLSearchParams(qs).forEach((v, k) => { filters[k] = v; });
  }
  return (
    <StatCard
      {...props}
      tracking={{ page: "admin_analytics", card: props.label, filters }}
    />
  );
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted-foreground))", "#22c55e", "#f59e0b", "#ef4444"];

interface Kpi {
  totalUsers: number;
  newToday: number;
  newWeek: number;
  newMonth: number;
  dau: number;
  wau: number;
  mau: number;
  totalLogins: number;
  successLogins: number;
  failedLogins: number;
  totalVisitors: number;
  uniqueVisitors: number;
  totalPageViews: number;
  avgSessionSec: number;
  bounceRate: number;
  pagesPerSession: number;
  gdSessions: number;
  completedSessions: number;
  avgSessionTime: number;
  avgAiScore: number;
  totalAiEvals: number;
  totalFeedback: number;
  articleViews: number;
  activeAds: number;
  adImpressions: number;
  adClicks: number;
  ctr: number;
  apiRequests: number;
  apiErrors: number;
  aiRequests: number;
  tokenUsage: number;
  revenue: number;
}

export default function AdminAnalytics() {
  const [k, setK] = useState<Kpi | null>(null);
  const [daily, setDaily] = useState<Array<{ day: string; signups: number; visitors: number; sessions: number; impressions: number; clicks: number }>>([]);
  const [devices, setDevices] = useState<Array<{ name: string; value: number }>>([]);
  const [browsers, setBrowsers] = useState<Array<{ name: string; value: number }>>([]);
  const [countries, setCountries] = useState<Array<{ name: string; value: number }>>([]);
  const [topArticles, setTopArticles] = useState<Array<{ title: string; view_count: number }>>([]);
  const [topAds, setTopAds] = useState<Array<{ title: string; click_count: number; view_count: number }>>([]);

  useEffect(() => {
    (async () => {
      const from30 = subDays(new Date(), 30).toISOString();
      const from7 = subDays(new Date(), 7).toISOString();
      const from1 = subDays(new Date(), 1).toISOString();

      const [
        profilesTotal, profilesToday, profilesWeek, profilesMonth,
        activeRows,
        loginsAll, loginsOk, loginsFail,
        pv,
        sessRows,
        gdAll, gdDone, gdMetrics,
        feedback,
        articles,
        adsActive, adImps, adClicks, adsTop,
        ai, aiTok,
        errors,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from1),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from7),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from30),
        // Distinct active users need the raw rows — a row count would inflate
        // DAU/WAU/MAU because one user can own many visitor sessions.
        fetchAllPaginated<{ user_id: string | null; last_seen: string }>(
          "visitor_sessions", "user_id,last_seen", { gte: ["last_seen", from30] },
        ),
        supabase.from("login_events").select("id", { count: "exact", head: true }),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", true),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", false),
        supabase.from("page_views").select("id", { count: "exact", head: true }),
        // Full visitor-session table (paginated) so visitors / unique visitors /
        // bounce rate / pages-per-session are exact rather than capped at 1000.
        fetchAllPaginated<{ visitor_id: string; page_count: number | null; first_seen: string; last_seen: string; device: string | null; browser: string | null; country: string | null }>(
          "visitor_sessions", "visitor_id,page_count,first_seen,last_seen,device,browser,country",
        ),
        supabase.from("gd_sessions").select("id", { count: "exact", head: true }),
        supabase.from("gd_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
        fetchAllPaginated<{ content_score: number | null }>("gd_metrics", "content_score"),
        supabase.from("user_feedback").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("title,view_count").order("view_count", { ascending: false }).limit(5),
        supabase.from("advertisements").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("ad_impressions").select("id", { count: "exact", head: true }),
        supabase.from("ad_clicks").select("id", { count: "exact", head: true }),
        supabase.from("advertisements").select("title, click_count, view_count").order("click_count", { ascending: false }).limit(5),
        supabase.from("ai_costs").select("id", { count: "exact", head: true }),
        fetchAllPaginated<{ input_tokens: number | null; output_tokens: number | null }>("token_usage", "input_tokens,output_tokens"),
        supabase.from("error_logs").select("id", { count: "exact", head: true }),
      ]);

      const distinctActive = (sinceISO: string) =>
        new Set(
          activeRows
            .filter((r) => r.user_id && r.last_seen >= sinceISO)
            .map((r) => r.user_id as string),
        ).size;

      const uniq = new Set(sessRows.map((r) => r.visitor_id)).size;
      const totalSessions = sessRows.length;
      const avgPages = totalSessions ? (sessRows.reduce((s, r) => s + (r.page_count || 1), 0) / totalSessions) : 0;
      const bounces = sessRows.filter((r) => (r.page_count || 1) <= 1).length;
      const bounceRate = totalSessions ? (bounces / totalSessions) * 100 : 0;
      const avgDur = totalSessions
        ? sessRows.reduce((s, r) => s + ((new Date(r.last_seen).getTime() - new Date(r.first_seen).getTime()) / 1000), 0) / totalSessions
        : 0;

      const avgAi = gdMetrics.length
        ? gdMetrics.reduce((s, r) => s + (r.content_score ?? 0), 0) / gdMetrics.length
        : 0;

      const totalTok = aiTok.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0);

      const impCount = adImps.count ?? 0;
      const clickCount = adClicks.count ?? 0;
      const ctr = impCount ? (clickCount / impCount) * 100 : 0;

      setK({
        totalUsers: profilesTotal.count ?? 0,
        newToday: profilesToday.count ?? 0,
        newWeek: profilesWeek.count ?? 0,
        newMonth: profilesMonth.count ?? 0,
        dau: distinctActive(from1), wau: distinctActive(from7), mau: distinctActive(from30),
        totalLogins: loginsAll.count ?? 0,
        successLogins: loginsOk.count ?? 0,
        failedLogins: loginsFail.count ?? 0,
        totalVisitors: totalSessions,
        uniqueVisitors: uniq,
        totalPageViews: pv.count ?? 0,
        avgSessionSec: Math.round(avgDur),
        bounceRate: Math.round(bounceRate),
        pagesPerSession: Math.round(avgPages * 10) / 10,
        gdSessions: gdAll.count ?? 0,
        completedSessions: gdDone.count ?? 0,
        avgSessionTime: 0,
        avgAiScore: Math.round(avgAi),
        totalAiEvals: ai.count ?? 0,
        totalFeedback: feedback.count ?? 0,
        articleViews: (articles.data ?? []).reduce((s, r) => s + (r.view_count || 0), 0),
        activeAds: adsActive.count ?? 0,
        adImpressions: impCount,
        adClicks: clickCount,
        ctr: Math.round(ctr * 100) / 100,
        apiRequests: pv.count ?? 0,
        apiErrors: errors.count ?? 0,
        aiRequests: ai.count ?? 0,
        tokenUsage: totalTok,
        revenue: 0,
      });

      setTopArticles((articles.data ?? []).map((r) => ({ title: r.title, view_count: r.view_count || 0 })));
      setTopAds(adsTop.data ?? []);

      // Daily buckets (last 30d) — signups vs visitors vs impressions.
      // All range reads are paginated so a busy day is never truncated.
      const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
      const [profilesRange, visRange, gdRange, impRange, clkRange] = await Promise.all([
        fetchAllPaginated<{ created_at: string }>("profiles", "created_at", { gte: ["created_at", from30] }),
        fetchAllPaginated<{ first_seen: string }>("visitor_sessions", "first_seen", { gte: ["first_seen", from30] }),
        fetchAllPaginated<{ created_at: string }>("gd_sessions", "created_at", { gte: ["created_at", from30] }),
        fetchAllPaginated<{ created_at: string }>("ad_impressions", "created_at", { gte: ["created_at", from30] }),
        fetchAllPaginated<{ created_at: string }>("ad_clicks", "created_at", { gte: ["created_at", from30] }),
      ]);
      const bucket = (col: Array<Record<string, unknown>>, field: string) => {
        const m = new Map<string, number>();
        col.forEach((r) => {
          const raw = r[field];
          if (!raw) return;
          const d = format(new Date(String(raw)), "yyyy-MM-dd");
          m.set(d, (m.get(d) ?? 0) + 1);
        });
        return m;
      };
      const s = bucket(profilesRange, "created_at");
      const v = bucket(visRange, "first_seen");
      const g = bucket(gdRange, "created_at");
      const im = bucket(impRange, "created_at");
      const cl = bucket(clkRange, "created_at");
      setDaily(days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return {
          day: format(d, "MMM d"),
          signups: s.get(key) ?? 0,
          visitors: v.get(key) ?? 0,
          sessions: g.get(key) ?? 0,
          impressions: im.get(key) ?? 0,
          clicks: cl.get(key) ?? 0,
        };
      }));

      // distributions — reuse the already-paginated session rows (exact)
      const count = (arr: Array<string | null>) => {
        const m = new Map<string, number>();
        arr.forEach((x) => { const key = (x || "unknown"); m.set(key, (m.get(key) ?? 0) + 1); });
        return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
      };
      setDevices(count(sessRows.map((r) => r.device)));
      setBrowsers(count(sessRows.map((r) => r.browser)));
      setCountries(count(sessRows.map((r) => r.country)));
    })().catch(console.error);
  }, []);

  if (!k) return <div className="text-muted-foreground p-6">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Live KPIs from real user activity.</p>
      </div>

      <section aria-labelledby="users-h" className="space-y-3">
        <h2 id="users-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="Total users" value={k.totalUsers} href="/home/admin/users" hint="Open users list" />
          <LinkedStat label="New today" value={k.newToday} href="/home/admin/users?range=1d" hint="Users created in the last 24h" />
          <LinkedStat label="New this week" value={k.newWeek} href="/home/admin/users?range=7d" hint="Users created in the last 7 days" />
          <LinkedStat label="New this month" value={k.newMonth} href="/home/admin/users?range=30d" hint="Users created in the last 30 days" />
          <LinkedStat label="DAU" value={k.dau} onClick={() => setDrill("dau")} hint="Daily active users — open trend" />
          <LinkedStat label="WAU" value={k.wau} onClick={() => setDrill("wau")} hint="Weekly active users — open trend" />
          <LinkedStat label="MAU" value={k.mau} onClick={() => setDrill("mau")} hint="Monthly active users — open trend" />
        </div>
      </section>

      <section aria-labelledby="auth-h" className="space-y-3">
        <h2 id="auth-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Authentication</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="Total logins" value={k.totalLogins} onClick={() => setDrill("totalLogins")} hint="Login volume over time" />
          <LinkedStat label="Successful" value={k.successLogins} onClick={() => setDrill("successLogins")} hint="Successful sign-ins over time" />
          <LinkedStat label="Failed" value={k.failedLogins} onClick={() => setDrill("failedLogins")} hint="Failed sign-in attempts over time" />
        </div>
      </section>

      <section aria-labelledby="traffic-h" className="space-y-3">
        <h2 id="traffic-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Traffic</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="Total visitors" value={k.totalVisitors} onClick={() => setDrill("totalVisitors")} hint="Visitor sessions per day" />
          <LinkedStat label="Unique visitors" value={k.uniqueVisitors} onClick={() => setDrill("uniqueVisitors")} hint="Distinct visitors per day" />
          <LinkedStat label="Page views" value={k.totalPageViews} onClick={() => setDrill("pageViews")} hint="Page views per day" />
          <LinkedStat label="Avg session (s)" value={k.avgSessionSec} onClick={() => setDrill("avgSession")} hint="Average session duration per day" />
          <LinkedStat label="Bounce rate %" value={k.bounceRate} onClick={() => setDrill("bounceRate")} hint="Single-page sessions per day" />
          <LinkedStat label="Pages / session" value={k.pagesPerSession} onClick={() => setDrill("pagesPerSession")} hint="Pages per session per day" />
        </div>
      </section>

      <section aria-labelledby="eng-h" className="space-y-3">
        <h2 id="eng-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="GD sessions" value={k.gdSessions} href="/home/admin/sessions" hint="Browse all group discussions" />
          <LinkedStat label="Completed" value={k.completedSessions} href="/home/admin/sessions?status=completed" hint="Completed sessions" />
          <LinkedStat label="Avg AI score" value={k.avgAiScore} onClick={() => setDrill("avgAiScore")} hint="Average AI content score per day" />
          <LinkedStat label="AI evaluations" value={k.totalAiEvals} onClick={() => setDrill("aiEvaluations")} hint="AI evaluations per day" />
          <LinkedStat label="Feedback given" value={k.totalFeedback} href="/home/admin/reports" hint="User feedback & reports" />
        </div>
      </section>

      <section aria-labelledby="ads-h" className="space-y-3">
        <h2 id="ads-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Advertisements</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="Active ads" value={k.activeAds} href="/home/admin/ads?status=active" hint="Currently running ads" />
          <LinkedStat label="Impressions" value={k.adImpressions} onClick={() => setDrill("adImpressions")} hint="Ad impressions per day" />
          <LinkedStat label="Clicks" value={k.adClicks} onClick={() => setDrill("adClicks")} hint="Ad clicks per day" />
          <LinkedStat
            label="CTR %"
            value={k.ctr}
            onClick={() => { setDrill(null); setRatio({ numerator: "adClicks", denominator: "adImpressions", title: "Click-through rate", href: "/home/admin/campaigns" }); }}
            hint="Click-through rate per day"
          />
        </div>
      </section>

      <section aria-labelledby="sys-h" className="space-y-3">
        <h2 id="sys-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <LinkedStat label="AI requests" value={k.aiRequests} onClick={() => setDrill("aiRequests")} hint="AI requests per day" />
          <LinkedStat label="Token usage" value={k.tokenUsage} onClick={() => setDrill("tokenUsage")} hint="Tokens consumed per day" />
          <LinkedStat label="API errors" value={k.apiErrors} onClick={() => setDrill("apiErrors")} hint="Errors logged per day" />
        </div>
      </section>

      <KpiDrilldown
        kpi={drill}
        ratio={ratio}
        onOpenChange={(open) => { if (!open) { setDrill(null); setRatio(null); } }}
      />


      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Signups & Visitors (30d)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={10} interval={4} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Line dataKey="signups" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line dataKey="visitors" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">GD Sessions (30d)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={10} interval={4} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ad Impressions vs Clicks (30d)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={10} interval={4} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Line dataKey="impressions" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line dataKey="clicks" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Device distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={devices} dataKey="value" nameKey="name" outerRadius={80} label>
                  {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Browser distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={browsers} dataKey="value" nameKey="name" outerRadius={80} label>
                  {browsers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Country distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={countries} dataKey="value" nameKey="name" outerRadius={80} label>
                  {countries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top articles</CardTitle></CardHeader>
          <CardContent>
            {topArticles.length === 0 ? <div className="text-sm text-muted-foreground">No articles yet.</div> :
              <ul className="space-y-2">
                {topArticles.map((a) => (
                  <li key={a.title} className="flex justify-between text-sm">
                    <span className="truncate">{a.title}</span>
                    <span className="text-muted-foreground">{a.view_count}</span>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top ads</CardTitle></CardHeader>
          <CardContent>
            {topAds.length === 0 ? <div className="text-sm text-muted-foreground">No ads yet.</div> :
              <ul className="space-y-2">
                {topAds.map((a) => (
                  <li key={a.title} className="flex justify-between text-sm">
                    <span className="truncate">{a.title}</span>
                    <span className="text-muted-foreground">{a.click_count}c / {a.view_count}v</span>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
