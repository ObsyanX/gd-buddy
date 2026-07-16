import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_URL = "https://gd-buddy.vercel.app/";

function pickAudit(audits: Record<string, { numericValue?: number }>, key: string) {
  return audits?.[key]?.numericValue ?? null;
}

async function runPSI(url: string, strategy: "mobile" | "desktop") {
  const apiKey = Deno.env.get("PAGESPEED_API_KEY");
  const params = new URLSearchParams({ url, strategy, category: "performance" });
  if (apiKey) params.set("key", apiKey);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    const text = await res.text();
    const err: Error & { status?: number } = new Error(`PSI ${strategy} failed (${res.status}): ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const lhr = data.lighthouseResult ?? {};
  const audits = lhr.audits ?? {};
  return {
    strategy,
    performance_score: (lhr.categories?.performance?.score ?? null) as number | null,
    lcp_ms: pickAudit(audits, "largest-contentful-paint"),
    inp_ms: pickAudit(audits, "interactive") ?? pickAudit(audits, "interaction-to-next-paint"),
    cls: pickAudit(audits, "cumulative-layout-shift"),
    fcp_ms: pickAudit(audits, "first-contentful-paint"),
    tbt_ms: pickAudit(audits, "total-blocking-time"),
    ttfb_ms: pickAudit(audits, "server-response-time"),
    si_ms: pickAudit(audits, "speed-index"),
    raw: {
      finalUrl: lhr.finalUrl,
      fetchTime: lhr.fetchTime,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const url: string = body.url || DEFAULT_URL;
    const isCron: boolean = body.source === "cron";

    let userId: string | null = null;
    if (!isCron) {
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
      const { data: isAdmin } = await userClient.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const [mobile, desktop] = await Promise.all([
      runPSI(url, "mobile"),
      runPSI(url, "desktop"),
    ]);

    const admin = createClient(supabaseUrl, serviceKey);
    const rows = [mobile, desktop].map((r) => ({
      url,
      strategy: r.strategy,
      performance_score: r.performance_score,
      lcp_ms: r.lcp_ms,
      inp_ms: r.inp_ms,
      cls: r.cls,
      fcp_ms: r.fcp_ms,
      tbt_ms: r.tbt_ms,
      ttfb_ms: r.ttfb_ms,
      si_ms: r.si_ms,
      raw: r.raw as unknown as Record<string, unknown>,
      source: isCron ? "cron" : "manual",
      triggered_by: userId,
    }));
    const { error } = await admin.from("pagespeed_reports").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, mobile, desktop, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
