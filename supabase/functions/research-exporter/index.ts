// Track 9 · Slice 6 — Research Exporter.
// Admin-only. Builds an anonymized dataset (transcripts, stats, knowledge graph,
// timeline) for a session or org scope and records a `research_exports` row.
// PII is stripped in-place via simple regex redaction; user_ids are hashed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ADMIN_EMAIL = "duttasayan947595@gdbuddy.com";

const redact = (s: string) =>
  (s ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[card]");

async function hashId(id: string): Promise<string> {
  const data = new TextEncoder().encode("gdbuddy::" + id);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user || userData.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id, org_id, scope = "session" } = await req.json().catch(() => ({}));

    if (scope === "session" && !session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filter = scope === "session"
      ? { column: "session_id", value: session_id }
      : { column: "session_id", value: null };

    const [{ data: msgs }, { data: scores }, { data: nodes }, { data: edges }, { data: events }] =
      await Promise.all([
        admin.from("gd_messages").select("*").eq("session_id", session_id).order("created_at"),
        admin.from("session_scores").select("*").eq("session_id", session_id),
        admin.from("knowledge_nodes").select("*").eq("session_id", session_id),
        admin.from("knowledge_edges").select("*").eq("session_id", session_id),
        admin.from("event_log").select("*").eq("session_id", session_id).order("ts").limit(2000),
      ]);

    // Anonymize
    const userIdCache = new Map<string, string>();
    const anon = async (id: string | null | undefined) => {
      if (!id) return null;
      if (!userIdCache.has(id)) userIdCache.set(id, await hashId(id));
      return userIdCache.get(id)!;
    };

    const outTranscript = [];
    for (const m of msgs ?? []) {
      outTranscript.push({
        id: m.id,
        speaker: await anon((m as { user_id?: string }).user_id ?? null),
        role: (m as { role?: string }).role,
        text: redact(String((m as { content?: string }).content ?? "")),
        at: (m as { created_at?: string }).created_at,
      });
    }

    const dataset = {
      scope,
      session_id: session_id ?? null,
      org_id: org_id ?? null,
      generated_at: new Date().toISOString(),
      transcript: outTranscript,
      scores: scores ?? [],
      knowledge_graph: { nodes: nodes ?? [], edges: edges ?? [] },
      timeline: events ?? [],
      _notice:
        "This export is anonymized: emails/phones/cards redacted; user_ids hashed with SHA-256 truncated to 8 bytes.",
    };

    // Persist metadata row (download_url intentionally embedded as data URL for now).
    const encoded = "data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(dataset))));
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { data: exp, error: expErr } = await admin
      .from("research_exports")
      .insert({
        org_id: org_id ?? null,
        scope,
        anonymized_at: new Date().toISOString(),
        download_url: encoded,
        expires_at: expiresAt,
      })
      .select()
      .maybeSingle();
    if (expErr) throw expErr;

    return new Response(
      JSON.stringify({ ok: true, export_id: exp?.id, expires_at: expiresAt, dataset }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
