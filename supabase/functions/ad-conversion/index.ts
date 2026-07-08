import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Affiliate postback endpoint. Records a conversion + revenue for an ad.
// Body: { ad_id, visitor_id?, user_id?, revenue_cents, currency?, source?, postback_ref?, meta? }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const ad_id = String(body.ad_id ?? "");
    const revenue_cents = Number(body.revenue_cents ?? 0);
    if (!ad_id || !Number.isFinite(revenue_cents) || revenue_cents < 0) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: corsHeaders });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("ad_conversions").insert({
      ad_id,
      visitor_id: body.visitor_id ?? null,
      user_id: body.user_id ?? null,
      revenue_cents,
      currency: body.currency ?? "USD",
      source: body.source ?? null,
      postback_ref: body.postback_ref ?? null,
      meta: body.meta ?? {},
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
