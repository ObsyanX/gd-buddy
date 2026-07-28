// Mint a signature for a share attribution ref. Called from the client at
// share time so the shareable URL can carry a tamper-proof `s=` token.
// The server rejects forged conversions in track-event via HMAC check.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signShareRef } from "../_shared/share-sig.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function verifiedUserId(req: Request): Promise<string | null> {
  const h = req.headers.get("Authorization") ?? "";
  if (!h.startsWith("Bearer ")) return null;
  const jwt = h.slice(7);
  try {
    const c = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data } = await c.auth.getClaims(jwt);
    return (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}

const ALLOWED_KINDS = new Set(["profile", "report", "multiplayer", "invite", "generic"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const uid = await verifiedUserId(req);
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { kind, ref } = await req.json();
    if (typeof kind !== "string" || typeof ref !== "string" || !ALLOWED_KINDS.has(kind) || ref.length > 200) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // For profile/report, the caller must own the id being signed to prevent
    // one user from minting signed links attributing installs to strangers.
    if (kind === "profile" && ref !== uid) {
      return new Response(JSON.stringify({ error: "ref_owner_mismatch" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const sig = await signShareRef(kind, ref);
    return new Response(JSON.stringify({ sig }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
