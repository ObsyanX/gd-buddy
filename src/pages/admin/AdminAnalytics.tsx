import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, CartesianGrid } from "recharts";
import { StatCard } from "@/components/charts";
import { format, subDays } from "date-fns";

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
        dauQ, wauQ, mauQ,
        loginsAll, loginsOk, loginsFail,
        pv, pvUnique,
        sess,
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
        supabase.from("visitor_sessions").select("user_id", { count: "exact", head: true }).gte("last_seen", from1).not("user_id", "is", null),
        supabase.from("visitor_sessions").select("user_id", { count: "exact", head: true }).gte("last_seen", from7).not("user_id", "is", null),
        supabase.from("visitor_sessions").select("user_id", { count: "exact", head: true }).gte("last_seen", from30).not("user_id", "is", null),
        supabase.from("login_events").select("id", { count: "exact", head: true }),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", true),
        supabase.from("login_events").select("id", { count: "exact", head: true }).eq("success", false),
        supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", from30),
        supabase.from("visitor_sessions").select("visitor_id"),
        supabase.from("visitor_sessions").select("page_count, first_seen, last_seen").gte("last_seen", from30),
        supabase.from("gd_sessions").select("id", { count: "exact", head: true }),
        supabase.from("gd_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("gd_metrics").select("content_score"),
        supabase.from("user_feedback").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("title,view_count").order("view_count", { ascending: false }).limit(5),
        supabase.from("advertisements").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("ad_impressions").select("id", { count: "exact", head: true }),
        supabase.from("ad_clicks").select("id", { count: "exact", head: true }),
        supabase.from("advertisements").select("title, click_count, view_count").order("click_count", { ascending: false }).limit(5),
        supabase.from("ai_costs").select("id", { count: "exact", head: true }),
        supabase.from("token_usage").select("input_tokens, output_tokens"),
        supabase.from("error_logs").select("id", { count: "exact", head: true }),
      ]);

      const uniq = new Set((pvUnique.data ?? []).map((r) => r.visitor_id)).size;
      const totalSessions = sess.data?.length ?? 0;
      const avgPages = totalSessions ? (sess.data!.reduce((s, r) => s + (r.page_count || 1), 0) / totalSessions) : 0;
      const bounces = sess.data?.filter((r) => (r.page_count || 1) <= 1).length ?? 0;
      const bounceRate = totalSessions ? (bounces / totalSessions) * 100 : 0;
      const avgDur = totalSessions
        ? sess.data!.reduce((s, r) => s + ((new Date(r.last_seen).getTime() - new Date(r.first_seen).getTime()) / 1000), 0) / totalSessions
        : 0;

      const avgAi = gdMetrics.data?.length
        ? gdMetrics.data.reduce((s, r) => s + (r.content_score ?? 0), 0) / gdMetrics.data.length
        : 0;

      const totalTok = (aiTok.data ?? []).reduce((s: number, r: { input_tokens?: number | null; output_tokens?: number | null }) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0);

      const impCount = adImps.count ?? 0;
      const clickCount = adClicks.count ?? 0;
      const ctr = impCount ? (clickCount / impCount) * 100 : 0;

      setK({
        totalUsers: profilesTotal.count ?? 0,
        newToday: profilesToday.count ?? 0,
        newWeek: profilesWeek.count ?? 0,
        newMonth: profilesMonth.count ?? 0,
        dau: dauQ.count ?? 0, wau: wauQ.count ?? 0, mau: mauQ.count ?? 0,
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

      // Daily buckets (last 30d) — signups vs visitors vs impressions
      const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
      const [profilesRange, visRange, gdRange, impRange, clkRange] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", from30),
        supabase.from("visitor_sessions").select("first_seen").gte("first_seen", from30),
        supabase.from("gd_sessions").select("created_at").gte("created_at", from30),
        supabase.from("ad_impressions").select("created_at").gte("created_at", from30),
        supabase.from("ad_clicks").select("created_at").gte("created_at", from30),
      ]);
      const bucket = (col: Array<{ [k: string]: string }> | null | undefined, field: string) => {
        const m = new Map<string, number>();
        (col ?? []).forEach((r) => {
          const d = format(new Date(r[field]), "yyyy-MM-dd");
          m.set(d, (m.get(d) ?? 0) + 1);
        });
        return m;
      };
      const s = bucket(profilesRange.data, "created_at");
      const v = bucket(visRange.data, "first_seen");
      const g = bucket(gdRange.data, "created_at");
      const im = bucket(impRange.data, "created_at");
      const cl = bucket(clkRange.data, "created_at");
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

      // distributions
      const { data: dist } = await supabase.from("visitor_sessions").select("device, browser, country");
      const count = (arr: Array<string | null>) => {
        const m = new Map<string, number>();
        arr.forEach((x) => { const k = (x || "unknown"); m.set(k, (m.get(k) ?? 0) + 1); });
        return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
      };
      setDevices(count((dist ?? []).map((r) => r.device)));
      setBrowsers(count((dist ?? []).map((r) => r.browser)));
      setCountries(count((dist ?? []).map((r) => r.country)));
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
          <StatCard label="Total users" value={k.totalUsers} href="/home/admin/users" hint="Open users list" />
          <StatCard label="New today" value={k.newToday} href="/home/admin/users?range=1d" hint="Users created in the last 24h" />
          <StatCard label="New this week" value={k.newWeek} href="/home/admin/users?range=7d" hint="Users created in the last 7 days" />
          <StatCard label="New this month" value={k.newMonth} href="/home/admin/users?range=30d" hint="Users created in the last 30 days" />
          <StatCard label="DAU" value={k.dau} href="/home/admin/users?active=1d" hint="Daily active users" />
          <StatCard label="WAU" value={k.wau} href="/home/admin/users?active=7d" hint="Weekly active users" />
          <StatCard label="MAU" value={k.mau} href="/home/admin/users?active=30d" hint="Monthly active users" />
        </div>
      </section>

      <section aria-labelledby="auth-h" className="space-y-3">
        <h2 id="auth-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Authentication</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total logins" value={k.totalLogins} href="/home/admin/auth-errors" hint="See login history & failures" />
          <StatCard label="Successful" value={k.successLogins} href="/home/admin/auth-errors?status=success" hint="Successful sign-ins" />
          <StatCard label="Failed" value={k.failedLogins} href="/home/admin/auth-errors?status=failed" hint="Failed sign-in attempts" />
        </div>
      </section>

      <section aria-labelledby="traffic-h" className="space-y-3">
        <h2 id="traffic-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Traffic</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total visitors" value={k.totalVisitors} href="/home/admin/performance" hint="Visitor sessions & performance" />
          <StatCard label="Unique visitors" value={k.uniqueVisitors} href="/home/admin/performance" hint="Distinct visitor IDs" />
          <StatCard label="Page views" value={k.totalPageViews} href="/home/admin/performance" hint="Page view breakdown" />
          <StatCard label="Avg session (s)" value={k.avgSessionSec} href="/home/admin/performance" hint="Average session duration" />
          <StatCard label="Bounce rate %" value={k.bounceRate} href="/home/admin/performance" hint="Single-page-view sessions" />
          <StatCard label="Pages / session" value={k.pagesPerSession} href="/home/admin/performance" hint="Pages per visitor session" />
        </div>
      </section>

      <section aria-labelledby="eng-h" className="space-y-3">
        <h2 id="eng-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="GD sessions" value={k.gdSessions} href="/home/admin/sessions" hint="Browse all group discussions" />
          <StatCard label="Completed" value={k.completedSessions} href="/home/admin/sessions?status=completed" hint="Completed sessions" />
          <StatCard label="Avg AI score" value={k.avgAiScore} href="/home/admin/sessions" hint="Average AI content score" />
          <StatCard label="AI evaluations" value={k.totalAiEvals} href="/home/admin/intelligence" hint="AI cost & evaluation logs" />
          <StatCard label="Feedback given" value={k.totalFeedback} href="/home/admin/reports" hint="User feedback & reports" />
        </div>
      </section>

      <section aria-labelledby="ads-h" className="space-y-3">
        <h2 id="ads-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Advertisements</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active ads" value={k.activeAds} href="/home/admin/ads?status=active" hint="Currently running ads" />
          <StatCard label="Impressions" value={k.adImpressions} href="/home/admin/ads" hint="All ad impressions" />
          <StatCard label="Clicks" value={k.adClicks} href="/home/admin/ads" hint="All ad clicks" />
          <StatCard label="CTR %" value={k.ctr} href="/home/admin/campaigns" hint="Campaign performance" />
        </div>
      </section>

      <section aria-labelledby="sys-h" className="space-y-3">
        <h2 id="sys-h" className="text-sm font-medium text-muted-foreground uppercase tracking-widest">System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="AI requests" value={k.aiRequests} href="/home/admin/intelligence" hint="AI request & cost logs" />
          <StatCard label="Token usage" value={k.tokenUsage} href="/home/admin/intelligence" hint="Token consumption details" />
          <StatCard label="API errors" value={k.apiErrors} href="/home/admin/edge-errors" hint="Edge function errors" />
        </div>
      </section>


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
