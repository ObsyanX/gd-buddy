// Personal AI provider key management. Every action is JWT-authenticated and
// scoped to the caller's own rows. Plaintext keys are never returned.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { ADAPTERS } from "../_shared/ai/adapters.ts";
import { encryptSecret, decryptSecret, maskTail, redact } from "../_shared/ai/crypto.ts";
import { classifyStatus, classifyThrown } from "../_shared/ai/errors.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PUBLIC_COLS =
  "id,provider,category,key_tail,model,enabled,priority,validation_status,validation_message,last_validated_at,last_used_at,disabled_until,consecutive_failures,updated_at";

const Provider = z.string().refine((p) => p in ADAPTERS, "Unknown provider");
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("save"), provider: Provider, apiKey: z.string().min(8).max(500), model: z.string().max(100).optional() }),
  z.object({ action: z.literal("validate"), provider: Provider }),
  z.object({ action: z.literal("update"), provider: Provider, enabled: z.boolean().optional(), model: z.string().max(100).nullable().optional() }),
  z.object({ action: z.literal("delete"), provider: Provider }),
  z.object({ action: z.literal("dismiss_event"), id: z.string().uuid() }),
  z.object({
    action: z.literal("preferences"),
    preferred_text: z.string().nullable().optional(),
    preferred_voice: z.string().nullable().optional(),
    preferred_stt: z.string().nullable().optional(),
    preferred_vision: z.string().nullable().optional(),
    platform_fallback: z.boolean().optional(),
    priority_order: z.record(z.array(z.string())).optional(),
  }),
]);

async function runValidation(provider: string, key: string) {
  try {
    const res = await ADAPTERS[provider].validate(key);
    if (res.ok) { await res.body?.cancel(); return { status: "connected", message: null as string | null }; }
    const err = classifyStatus(res.status, await res.text(), res.headers);
    return { status: err.kind, message: redact(err.message).slice(0, 300) };
  } catch (e) {
    const err = classifyThrown(e);
    return { status: err.kind, message: redact(err.message).slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.slice(7));
  if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const uid = claims.claims.sub as string;
  const db = createClient(URL_, SERVICE);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const b = parsed.data;

  try {
    switch (b.action) {
      case "list": {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const [creds, prefs, events, usage] = await Promise.all([
          db.from("user_provider_credentials").select(PUBLIC_COLS).eq("user_id", uid),
          db.from("user_ai_preferences").select("*").eq("user_id", uid).maybeSingle(),
          db.from("ai_provider_events").select("*").eq("user_id", uid).eq("dismissed", false).order("updated_at", { ascending: false }).limit(100),
          db.from("ai_usage_events").select("provider,outcome,input_tokens,output_tokens,created_at").eq("user_id", uid).gte("created_at", since).limit(5000),
        ]);
        const counts: Record<string, { requests: number; errors: number; tokens: number; last: string | null }> = {};
        for (const u of usage.data ?? []) {
          const c = (counts[u.provider] ??= { requests: 0, errors: 0, tokens: 0, last: null });
          c.requests++; if (u.outcome === "error") c.errors++;
          c.tokens += (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
          if (!c.last || u.created_at > c.last) c.last = u.created_at;
        }
        const catalog = Object.values(ADAPTERS).map((a) => ({
          id: a.id, label: a.label, category: a.category, models: a.models, dashboardUrl: a.dashboardUrl, reportsQuota: a.reportsQuota,
        }));
        return json({ catalog, credentials: creds.data ?? [], preferences: prefs.data ?? { platform_fallback: true }, events: events.data ?? [], usage: counts, synced_at: new Date().toISOString() });
      }
      case "save": {
        const key = b.apiKey.trim();
        const v = await runValidation(b.provider, key);
        const row = {
          user_id: uid, provider: b.provider, category: ADAPTERS[b.provider].category,
          encrypted_key: await encryptSecret(key), key_tail: maskTail(key),
          model: b.model ?? null, enabled: true, validation_status: v.status, validation_message: v.message,
          last_validated_at: new Date().toISOString(), consecutive_failures: 0, disabled_until: null,
          updated_at: new Date().toISOString(),
        };
        const { data: existing } = await db.from("user_provider_credentials").select("id").eq("user_id", uid).eq("provider", b.provider).maybeSingle();
        const q = existing
          ? db.from("user_provider_credentials").update(row).eq("id", existing.id)
          : db.from("user_provider_credentials").insert(row);
        const { error } = await q;
        if (error) throw error;
        return json({ ok: true, status: v.status, message: v.message });
      }
      case "validate": {
        const { data } = await db.from("user_provider_credentials").select("id,encrypted_key").eq("user_id", uid).eq("provider", b.provider).maybeSingle();
        if (!data) return json({ error: "No key saved for this provider" }, 404);
        const v = await runValidation(b.provider, await decryptSecret(data.encrypted_key));
        await db.from("user_provider_credentials").update({
          validation_status: v.status, validation_message: v.message, last_validated_at: new Date().toISOString(),
          ...(v.status === "connected" ? { consecutive_failures: 0, disabled_until: null } : {}),
        }).eq("id", data.id);
        return json({ ok: v.status === "connected", status: v.status, message: v.message });
      }
      case "update": {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (b.enabled !== undefined) patch.enabled = b.enabled;
        if (b.model !== undefined) patch.model = b.model;
        const { error } = await db.from("user_provider_credentials").update(patch).eq("user_id", uid).eq("provider", b.provider);
        if (error) throw error;
        return json({ ok: true });
      }
      case "delete": {
        await db.from("user_provider_credentials").delete().eq("user_id", uid).eq("provider", b.provider);
        return json({ ok: true });
      }
      case "dismiss_event": {
        await db.from("ai_provider_events").update({ dismissed: true }).eq("id", b.id).eq("user_id", uid);
        return json({ ok: true });
      }
      case "preferences": {
        const { action: _a, ...rest } = b;
        const { error } = await db.from("user_ai_preferences").upsert({ user_id: uid, ...rest, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        if (error) throw error;
        return json({ ok: true });
      }
    }
  } catch (e) {
    console.error("[ai-keys]", redact((e as Error).message));
    return json({ error: "Request failed" }, 500);
  }
});
