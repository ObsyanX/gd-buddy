import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function randToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, source } = await req.json();
    if (typeof email !== "string" || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400, headers: corsHeaders });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const confirm_token = randToken();
    const unsubscribe_token = randToken();
    const { error } = await admin.from("newsletter_subscribers").upsert(
      { email: email.toLowerCase(), source: source ?? null, confirm_token, unsubscribe_token, confirmed: false },
      { onConflict: "email" },
    );
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ ok: true, confirm_token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
