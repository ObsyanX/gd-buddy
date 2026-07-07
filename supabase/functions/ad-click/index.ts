import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    const adId = url.searchParams.get("id") || (req.method === "POST" ? (await req.json()).ad_id : null);
    const placement = url.searchParams.get("placement") || null;
    const visitorId = url.searchParams.get("v") || null;
    if (!adId) return new Response("missing id", { status: 400, headers: cors });

    const { data: ad } = await admin.from("advertisements").select("*").eq("id", adId).maybeSingle();
    if (!ad) return new Response("not found", { status: 404, headers: cors });

    await admin.from("ad_clicks").insert({
      ad_id: adId,
      visitor_id: visitorId,
      placement,
      referrer: req.headers.get("referer"),
      country: req.headers.get("cf-ipcountry"),
    });
    await admin.from("advertisements").update({ click_count: (ad.click_count || 0) + 1 }).eq("id", adId);

    // Build destination with UTM
    const dest = new URL(ad.destination_url);
    if (ad.utm_source) dest.searchParams.set("utm_source", ad.utm_source);
    if (ad.utm_medium) dest.searchParams.set("utm_medium", ad.utm_medium);
    if (ad.utm_campaign) dest.searchParams.set("utm_campaign", ad.utm_campaign);

    // GET → 302 redirect for anchor navigation
    if (req.method === "GET") {
      return new Response(null, { status: 302, headers: { ...cors, Location: dest.toString() } });
    }
    return new Response(JSON.stringify({ ok: true, url: dest.toString() }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ad-click error", e);
    return new Response("error", { status: 500, headers: cors });
  }
});
