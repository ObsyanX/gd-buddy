import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/supabase-auth";
import { Send } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface DailyRow { day: string; visitors: number; signups: number; gd_sessions: number; ad_revenue_cents: number; }
interface ArticleRow { id: string; title: string; slug: string; view_count: number; }
interface AdRow { id: string; title: string; view_count: number; click_count: number; revenue_cents: number; }

export default function AdminReportsDigest() {
  const { isAdmin } = useUserRoles();
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [sending, setSending] = useState(false);
  const [subCount, setSubCount] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const [{ data: d }, { data: a }, { data: ads_ }, { count }] = await Promise.all([
      supabase.from("analytics_daily").select("day,visitors,signups,gd_sessions,ad_revenue_cents").gte("day", since).order("day"),
      supabase.from("articles").select("id,title,slug,view_count").eq("status", "published").order("view_count", { ascending: false }).limit(5),
      supabase.from("advertisements").select("id,title,view_count,click_count,revenue_cents").order("view_count", { ascending: false }).limit(5),
      supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("confirmed", true).eq("digest_opt_in", true),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDaily(((d as any[]) ?? []) as DailyRow[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setArticles(((a as any[]) ?? []) as ArticleRow[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAds(((ads_ as any[]) ?? []) as AdRow[]);
    setSubCount(count ?? 0);
  }

  const totals = daily.reduce((acc, r) => ({
    visitors: acc.visitors + (r.visitors ?? 0),
    signups: acc.signups + (r.signups ?? 0),
    gd_sessions: acc.gd_sessions + (r.gd_sessions ?? 0),
    revenue: acc.revenue + (r.ad_revenue_cents ?? 0),
  }), { visitors: 0, signups: 0, gd_sessions: 0, revenue: 0 });

  async function sendNow() {
    setSending(true);
    const { error } = await invokeWithAuth("newsletter-digest", { body: { dry_run: false } });
    setSending(false);
    if (error) return toast({ title: "Send failed", description: error.message, variant: "destructive" });
    toast({ title: "Digest sent" });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly digest</h1>
          <p className="text-sm text-muted-foreground">{subCount} confirmed subscribers opted-in</p>
        </div>
        {isAdmin && (
          <Button onClick={sendNow} disabled={sending}><Send className="h-4 w-4 mr-1" />{sending ? "Sending…" : "Send now"}</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Visitors (7d)" value={totals.visitors.toLocaleString()} />
        <Stat label="Signups" value={totals.signups.toLocaleString()} />
        <Stat label="Sessions" value={totals.gd_sessions.toLocaleString()} />
        <Stat label="Ad revenue" value={`$${(totals.revenue / 100).toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Top articles</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm divide-y divide-border/40">
            {articles.map((a) => (
              <li key={a.id} className="flex justify-between py-1.5">
                <span className="truncate">{a.title}</span>
                <span className="text-muted-foreground">{a.view_count} views</span>
              </li>
            ))}
            {articles.length === 0 && <li className="text-muted-foreground text-sm">No published articles yet.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Top ads</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm divide-y divide-border/40">
            {ads.map((a) => (
              <li key={a.id} className="flex justify-between py-1.5">
                <span className="truncate">{a.title}</span>
                <span className="text-muted-foreground text-xs">{a.view_count} views · {a.click_count} clicks · ${(a.revenue_cents / 100).toFixed(2)}</span>
              </li>
            ))}
            {ads.length === 0 && <li className="text-muted-foreground text-sm">No ads yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </CardContent></Card>
  );
}
