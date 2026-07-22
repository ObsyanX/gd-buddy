import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-postback-signature, x-postback-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Postback signing secret. Advertisers/affiliate networks include:
//   X-Postback-Timestamp: <unix seconds>
//   X-Postback-Signature: hex(HMAC_SHA256(secret, `${timestamp}.${raw_body}`))
// Requests without a valid signature (within a 5-minute window) are rejected.
const POSTBACK_SECRET = Deno.env.get("AD_POSTBACK_SECRET");
const MAX_SKEW_SECONDS = 300;

async function verifySignature(rawBody: string, ts: string, sig: string): Promise<boolean> {
  if (!POSTBACK_SECRET || !ts || !sig) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > MAX_SKEW_SECONDS) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(POSTBACK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const macBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${rawBody}`));
  const expected = Array.from(new Uint8Array(macBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// Affiliate postback endpoint. Records a conversion + revenue for an ad.
// Body: { ad_id, visitor_id?, user_id?, revenue_cents, currency?, source?, postback_ref?, meta? }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!POSTBACK_SECRET) {
      return new Response(JSON.stringify({ error: "postback_disabled" }), {
        status: 503,
        headers: corsHeaders,
      });
    }

    const rawBody = await req.text();
    const ts = req.headers.get("x-postback-timestamp") ?? "";
    const sig = (req.headers.get("x-postback-signature") ?? "").toLowerCase();
    if (!(await verifySignature(rawBody, ts, sig))) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody); } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders });
    }
    const ad_id = String(body.ad_id ?? "");
    const revenue_cents = Number(body.revenue_cents ?? 0);
    if (!ad_id || !Number.isFinite(revenue_cents) || revenue_cents < 0) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ad_id refers to an existing ad before accepting the conversion.
    const { data: ad, error: adErr } = await admin
      .from("advertisements")
      .select("id")
      .eq("id", ad_id)
      .maybeSingle();
    if (adErr || !ad) {
      return new Response(JSON.stringify({ error: "unknown_ad" }), { status: 404, headers: corsHeaders });
    }

    const { error } = await admin.from("ad_conversions").insert({
      ad_id,
      visitor_id: (body as any).visitor_id ?? null,
      user_id: (body as any).user_id ?? null,
      revenue_cents,
      currency: (body as any).currency ?? "USD",
      source: (body as any).source ?? null,
      postback_ref: (body as any).postback_ref ?? null,
      meta: (body as any).meta ?? {},
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
