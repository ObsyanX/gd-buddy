import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UAParser } from "https://esm.sh/ua-parser-js@2.0.10";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Service-role client — this function accepts unauthenticated writes and
// records visitor telemetry only into admin-read tables.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function parseUA(ua: string) {
  try {
    const p = new UAParser(ua);
    const d = p.getDevice();
    return {
      device: d.type || "desktop",
      browser: p.getBrowser().name || "unknown",
      os: p.getOS().name || "unknown",
    };
  } catch {
    return { device: "unknown", browser: "unknown", os: "unknown" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const type: string = body.type;
    const visitorId: string = body.visitor_id || crypto.randomUUID();
    const userId: string | null = body.user_id || null;
    const path: string = body.path || "/";
    const referrer: string | null = body.referrer || null;
    const ua = req.headers.get("user-agent") || "";
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-country") || null;
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
    const { device, browser, os } = parseUA(ua);

    if (type === "page_view") {
      // upsert visitor session (last 30-min window)
      const { data: session } = await admin
        .from("visitor_sessions")
        .select("id,page_count")
        .eq("visitor_id", visitorId)
        .gte("last_seen", new Date(Date.now() - 30 * 60_000).toISOString())
        .order("last_seen", { ascending: false })
        .limit(1)
        .maybeSingle();

      let sessionId = session?.id;
      if (session) {
        await admin.from("visitor_sessions").update({
          last_seen: new Date().toISOString(),
          page_count: (session.page_count || 0) + 1,
          user_id: userId,
        }).eq("id", session.id);
      } else {
        const { data: created } = await admin
          .from("visitor_sessions")
          .insert({
            visitor_id: visitorId,
            user_id: userId,
            entry_path: path,
            device, browser, os, country,
            referrer,
            user_agent: ua,
          })
          .select("id")
          .single();
        sessionId = created?.id;
      }

      await admin.from("page_views").insert({
        visitor_id: visitorId,
        session_id: sessionId,
        user_id: userId,
        path,
        referrer,
        device, browser, os, country,
        user_agent: ua,
      });
    } else if (type === "login_success" || type === "login_failed") {
      await admin.from("login_events").insert({
        user_id: userId,
        email: body.email || null,
        success: type === "login_success",
        reason: body.reason || null,
        ip,
        user_agent: ua,
        country,
      });
    } else if (type === "statcard_click") {
      // Persist admin StatCard interactions for analytics/debugging.
      await admin.from("audit_events").insert({
        actor_user_id: userId,
        action: "statcard_click",
        resource_type: "admin_dashboard",
        resource_id: String(body.page || "unknown"),
        metadata: {
          page: body.page || null,
          card: body.card || null,
          destination: body.destination || null,
          filters: body.filters || {},
          path: body.path || null,
          device, browser, os, country,
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, visitor_id: visitorId }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-event error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, // never break the UI on tracking failure
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
