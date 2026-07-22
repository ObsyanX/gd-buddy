// Track 3 — Emotion analyzer.
// Runs text emotion via Lovable AI (with Groq fallback via _shared/ai-with-fallback.ts),
// applies deterministic prosody rules server-side, fuses both, PII-masks the
// rationale and writes an emotion_events row.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { callAI } from "../_shared/ai-with-fallback.ts";
import { requireSessionAccess } from "../_shared/auth-guard.ts";

const BodySchema = z.object({
  session_id: z.string().uuid(),
  participant_id: z.string().uuid().nullable().optional(),
  text: z.string().max(2000).nullable().optional(),
  prosody: z
    .object({
      pitch_hz: z.number().nonnegative().default(0),
      pitch_var_hz: z.number().nonnegative().default(0),
      energy_rms: z.number().min(0).max(2).default(0),
      zero_crossing_rate: z.number().min(0).max(1).default(0),
      voiced: z.boolean().default(false),
    })
    .nullable()
    .optional(),
});

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;
const CREDIT = /\b(?:\d[ -]*?){13,16}\b/g;
const AADHAAR = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
function maskPII(input: string): string {
  return (input || "")
    .replace(EMAIL, "[email]")
    .replace(AADHAAR, "[id]")
    .replace(CREDIT, "[card]")
    .replace(PHONE, "[phone]");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
const clamp01 = (n: number) => clamp(n, 0, 1);

function prosodyEmotion(p: {
  pitch_hz: number;
  energy_rms: number;
  zero_crossing_rate: number;
  voiced: boolean;
}) {
  if (!p.voiced) return { label: "neutral", valence: 0, arousal: 0, confidence: 0.2 };
  const arousal = clamp01(0.5 * (p.energy_rms * 4) + 0.5 * (p.zero_crossing_rate * 4));
  const pitchTilt = p.pitch_hz > 220 ? 0.3 : p.pitch_hz < 130 ? -0.2 : 0;
  const valence = arousal > 0.75 && p.pitch_hz < 150
    ? -0.4
    : pitchTilt + (arousal > 0.6 ? 0.1 : 0);
  let label = "neutral";
  if (arousal > 0.7 && valence < -0.1) label = "angry";
  else if (arousal > 0.7 && valence > 0.1) label = "excited";
  else if (arousal < 0.3) label = "calm";
  else if (valence > 0.15) label = "positive";
  else if (valence < -0.15) label = "tense";
  return { label, valence: clamp(valence, -1, 1), arousal, confidence: 0.55 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { session_id, participant_id, text, prosody } = parsed.data;

  const authOrResp = await requireSessionAccess(req, session_id);
  if (authOrResp instanceof Response) return authOrResp;


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Text emotion (only if consent-approved text provided).
  let textSignal: {
    label: string;
    valence: number;
    arousal: number;
    confidence: number;
    rationale: string;
  } | null = null;

  if (text && text.trim().length > 0) {
    try {
      const cleanedText = maskPII(text);
      const ai = await callAI({
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You classify short discussion utterances for emotion. Return strict JSON: {label, valence, arousal, confidence, rationale}. valence in [-1,1], arousal in [0,1], confidence in [0,1]. Keep rationale under 20 words.",
          },
          { role: "user", content: cleanedText.slice(0, 800) },
        ],
      });
      const raw = ai.choices?.[0]?.message?.content ?? "{}";
      const parsedJson = JSON.parse(raw);
      textSignal = {
        label: String(parsedJson.label ?? "neutral").toLowerCase(),
        valence: clamp(Number(parsedJson.valence) || 0, -1, 1),
        arousal: clamp01(Number(parsedJson.arousal) || 0),
        confidence: clamp01(Number(parsedJson.confidence) || 0),
        rationale: maskPII(String(parsedJson.rationale ?? "")).slice(0, 200),
      };
    } catch (err) {
      console.error("[emotion-analyzer] text inference failed", err);
    }
  }

  const prosodySignal = prosody ? prosodyEmotion(prosody) : null;

  if (!textSignal && !prosodySignal) {
    return json({ ok: true, skipped: "no_signals" });
  }

  // Fuse.
  let fused: {
    label: string;
    valence: number;
    arousal: number;
    confidence: number;
    evidence: Record<string, unknown>;
    source: "text" | "prosody" | "fused";
  };
  if (textSignal && prosodySignal) {
    const arousalWeight = prosodySignal.arousal > 0.7 ? 0.7 : 0.4;
    const arousal = prosodySignal.arousal * arousalWeight + textSignal.arousal * (1 - arousalWeight);
    const valenceWeight = textSignal.confidence > 0.6 ? 0.75 : 0.5;
    const valence = textSignal.valence * valenceWeight + prosodySignal.valence * (1 - valenceWeight);
    const confidence = Math.min(1, 0.5 * textSignal.confidence + 0.5 * prosodySignal.confidence + 0.1);
    let label = textSignal.label || prosodySignal.label;
    if (arousal > 0.7 && valence < -0.3) label = "angry";
    else if (arousal > 0.65 && valence > 0.2) label = "excited";
    else if (arousal < 0.3 && Math.abs(valence) < 0.2) label = "calm";
    else if (valence > 0.35) label = "positive";
    else if (valence < -0.35) label = "negative";
    fused = {
      label,
      valence: clamp(valence, -1, 1),
      arousal: clamp01(arousal),
      confidence,
      evidence: { text: textSignal, prosody: prosodySignal },
      source: "fused",
    };
  } else if (textSignal) {
    fused = { ...textSignal, evidence: { text: textSignal }, source: "text" };
  } else {
    fused = { ...prosodySignal!, evidence: { prosody: prosodySignal }, source: "prosody" };
  }

  const { error: insErr, data: inserted } = await supabase
    .from("emotion_events")
    .insert({
      session_id,
      participant_id: participant_id ?? null,
      source: fused.source,
      label: fused.label,
      valence: Number(fused.valence.toFixed(3)),
      arousal: Number(fused.arousal.toFixed(3)),
      confidence: Number(fused.confidence.toFixed(3)),
      evidence: fused.evidence,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[emotion-analyzer] insert failed", insErr);
    return json({ error: "insert_failed" }, 500);
  }

  // Fire-and-forget behaviour re-aggregation so health responds quickly.
  supabase.functions
    .invoke("behaviour-aggregator", { body: { session_id } })
    .catch((err) => console.error("[emotion-analyzer] behaviour invoke failed", err));

  return json({
    ok: true,
    emotion_event_id: inserted?.id,
    signal: { kind: "emotion_event", session_id, participant_id, ...fused },
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
