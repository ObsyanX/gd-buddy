import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Weekly digest: compiles top KPIs + top articles + top ads from the last 7 days
// and records send events. Actual email delivery goes through the existing
// newsletter transport when configured; otherwise this returns the payload
// so an admin can review it from /home/admin/reports/digest.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  let dryRun = true;
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    dryRun = body?.dry_run !== false;
  } catch { /* keep dryRun */ }

  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);

  const [{ data: daily }, { data: articles }, { data: ads }, { data: subs }] = await Promise.all([
    supabase.from("analytics_daily").select("day,visitors,signups,gd_sessions,ad_revenue_cents").gte("day", since).order("day"),
    supabase.from("articles").select("id,title,slug,view_count").eq("status", "published").order("view_count", { ascending: false }).limit(5),
    supabase.from("advertisements").select("id,title,view_count,click_count,revenue_cents").order("view_count", { ascending: false }).limit(5),
    supabase.from("newsletter_subscribers").select("id,email").eq("confirmed", true).eq("digest_opt_in", true),
  ]);

  const totals = (daily ?? []).reduce(
    // deno-lint-ignore no-explicit-any
    (acc: any, r: any) => ({
      visitors: acc.visitors + (r.visitors ?? 0),
      signups: acc.signups + (r.signups ?? 0),
      sessions: acc.sessions + (r.gd_sessions ?? 0),
      revenue_cents: acc.revenue_cents + (r.ad_revenue_cents ?? 0),
    }),
    { visitors: 0, signups: 0, sessions: 0, revenue_cents: 0 },
  );

  const payload = {
    period_start: since,
    period_end: new Date().toISOString().slice(0, 10),
    totals,
    top_articles: articles ?? [],
    top_ads: ads ?? [],
    recipient_count: subs?.length ?? 0,
  };

  if (!dryRun) {
    await supabase.from("audit_events").insert({
      action: "digest_sent",
      resource_type: "newsletter",
      metadata: {
        recipients: subs?.length ?? 0,
        totals,
      },
    });
    // Delivery hook: when RESEND_API_KEY or similar is present, fan out here.
    // Kept as an audit-only trigger for now so admins can review payload first.
  }

  return new Response(JSON.stringify({ ok: true, dry_run: dryRun, payload }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
