import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface AdRow {
  id: string;
  title: string;
  advertiser: string | null;
  description: string | null;
  image_url: string | null;
  image_url_dark: string | null;
  destination_url: string;
  cta_text: string | null;
  ad_type: string;
  placements: string[];
  countries: string[];
  operating_systems: string[];
  browsers: string[];
  devices: string[];
  weight: number;
  priority: number;
  rotation: string;
  max_views: number | null;
  max_clicks: number | null;
  view_count: number;
  click_count: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

function matchTarget(list: string[], value: string | null | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (!value) return false;
  return list.map((s) => s.toLowerCase()).includes(value.toLowerCase());
}

function pickAd(candidates: AdRow[]): AdRow | null {
  if (candidates.length === 0) return null;
  // priority tiers first
  const maxPri = Math.max(...candidates.map((c) => c.priority || 0));
  const priorityTier = candidates.filter((c) => (c.priority || 0) === maxPri);
  const strategy = priorityTier[0].rotation || "weighted";

  if (strategy === "random") {
    return priorityTier[Math.floor(Math.random() * priorityTier.length)];
  }
  if (strategy === "priority") {
    return priorityTier[0];
  }
  if (strategy === "sequential") {
    // deterministic on minute — cheap sequential
    const idx = Math.floor(Date.now() / 60_000) % priorityTier.length;
    return priorityTier[idx];
  }
  // weighted (default)
  const total = priorityTier.reduce((s, a) => s + Math.max(1, a.weight || 1), 0);
  let r = Math.random() * total;
  for (const a of priorityTier) {
    r -= Math.max(1, a.weight || 1);
    if (r <= 0) return a;
  }
  return priorityTier[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    const action: string = body.action || "serve";
    const placement: string = body.placement || "";
    const device: string | null = body.device || null;
    const browser: string | null = body.browser || null;
    const os: string | null = body.os || null;
    const country = body.country || req.headers.get("cf-ipcountry") || null;
    const visitorId: string | null = body.visitor_id || null;
    const userId: string | null = body.user_id || null;

    if (action === "impression") {
      const adId: string = body.ad_id;
      if (!adId) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      await admin.from("ad_impressions").insert({
        ad_id: adId, visitor_id: visitorId, user_id: userId, placement, country, device,
      });
      await admin.rpc as unknown;
      // increment view_count
      const { data: cur } = await admin.from("advertisements").select("view_count").eq("id", adId).maybeSingle();
      if (cur) await admin.from("advertisements").update({ view_count: (cur.view_count || 0) + 1 }).eq("id", adId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // serve: pick best ad for placement
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("advertisements")
      .select("*")
      .eq("status", "active")
      .contains("placements", [placement])
      .or(`start_date.is.null,start_date.lte.${nowIso}`)
      .or(`end_date.is.null,end_date.gte.${nowIso}`);
    if (error) throw error;

    const filtered = (data as AdRow[])
      .filter((a) => !a.max_views || a.view_count < a.max_views)
      .filter((a) => !a.max_clicks || a.click_count < a.max_clicks)
      .filter((a) => matchTarget(a.countries, country))
      .filter((a) => matchTarget(a.operating_systems, os))
      .filter((a) => matchTarget(a.browsers, browser))
      .filter((a) => matchTarget(a.devices, device));

    const ad = pickAd(filtered);
    if (!ad) {
      return new Response(JSON.stringify({ ok: true, ad: null }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, ad }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ad-serve error", e);
    return new Response(JSON.stringify({ ok: false, ad: null }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
