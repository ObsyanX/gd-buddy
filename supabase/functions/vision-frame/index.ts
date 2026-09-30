// Camera-frame analysis through the signed-in user's OWN vision key (OpenAI
// Vision / Gemini Vision). Used only when the main video analysis service is
// down. Never uses a shared/platform key and never invents scores: anything the
// model can't see is returned as null.
//
// Usage optimisation:
//  - server-side throttle: at most one frame per user every MIN_INTERVAL_MS
//  - the client sends a small, low-quality JPEG; we request `detail: "low"`
//  - short prompt + compact JSON reply keeps tokens per frame minimal
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { routeUserVision } from "../_shared/ai/router.ts";
import { loadCredentials, loadPrefs } from "../_shared/ai/credentials.ts";
import { parseAiJson } from "../_shared/parse-ai-json.ts";

const MIN_INTERVAL_MS = 8_000;
const MAX_IMAGE_CHARS = 400_000; // ~300 KB of base64
const lastCall = new Map<string, number>();

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROMPT =
  "You assess a group-discussion participant's webcam frame. Reply with ONLY compact JSON: " +
  '{"face_visible":bool,"eye_contact":0-100|null,"posture":0-100|null,"expression":0-100|null,"hands_visible":int|null,"tip":string|null}. ' +
  "eye_contact = looking at camera; posture = upright, shoulders level; expression = engaged/positive. " +
  "Use null for anything you cannot see clearly. Never guess. tip: max 12 words or null.";

const clamp = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error } = await client.auth.getClaims(auth.slice(7));
  const uid = claims?.claims?.sub as string | undefined;
  if (error || !uid) return json({ error: "Unauthorized" }, 401);

  let body: { image?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const image = typeof body.image === "string" ? body.image.replace(/^data:image\/\w+;base64,/, "") : "";
  if (!image || image.length > MAX_IMAGE_CHARS) return json({ error: "Image missing or too large" }, 400);

  // Cheap check first: no personal vision keys → client stops asking for this session.
  const prefs = await loadPrefs(uid).catch(() => null);
  const creds = prefs ? await loadCredentials(uid, "vision", prefs).catch(() => []) : [];
  if (!creds.length) return json({ status: "no_keys" });

  const now = Date.now();
  const prev = lastCall.get(uid) ?? 0;
  if (now - prev < MIN_INTERVAL_MS) return json({ status: "throttled", retry_after_ms: MIN_INTERVAL_MS - (now - prev) });
  lastCall.set(uid, now);
  if (lastCall.size > 5000) lastCall.clear();

  const result = await routeUserVision(uid, {
    messages: [{
      role: "user",
      content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "low" } },
      ],
    }],
    response_format: { type: "json_object" },
  });

  if (!result.response) {
    return json({
      status: "failed",
      attempted: result.attempted,
      error_kind: result.lastError?.kind ?? null,
      message: result.lastError ? `Your vision key failed (${result.lastError.kind}).` : "No usable vision key.",
    });
  }

  const content = (result.response.json as any)?.choices?.[0]?.message?.content ?? "";
  const parsed = parseAiJson<Record<string, unknown>>(content) ?? {};
  const faceVisible = parsed.face_visible === true;
  return json({
    status: "ok",
    provider: result.response.provider,
    model: result.response.model,
    byok: true,
    metrics: {
      face_visible: faceVisible,
      eye_contact_score: faceVisible ? clamp(parsed.eye_contact) : null,
      posture_score: faceVisible ? clamp(parsed.posture) : null,
      expression_score: faceVisible ? clamp(parsed.expression) : null,
      hands_detected_count: typeof parsed.hands_visible === "number" ? Math.max(0, Math.round(parsed.hands_visible)) : 0,
      tip: typeof parsed.tip === "string" ? parsed.tip.slice(0, 120) : null,
    },
  });
});
