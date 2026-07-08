import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? (await req.json().catch(() => ({}))).token;
  if (!token || typeof token !== "string") {
    return new Response("Invalid token", { status: 400, headers: corsHeaders });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token);
  if (error) return new Response("Error", { status: 500, headers: corsHeaders });
  return new Response("You have been unsubscribed.", { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
});
