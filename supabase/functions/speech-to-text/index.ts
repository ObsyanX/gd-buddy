import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { userIdFromAuth } from "../_shared/ai/request-user.ts";
import { getUserKeys, noteKeyOutcome, platformFallbackAllowed } from "../_shared/ai/router.ts";
import { classifyStatus, classifyThrown, type ClassifiedError } from "../_shared/ai/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const inputSchema = z.object({
  audio: z.string().min(1, 'Audio data required').max(14000000, 'Audio too large (max ~10MB)'),
});

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type SttResult = { ok: true; text: string } | { ok: false; err: ClassifiedError };

async function whisperStyle(url: string, key: string, model: string, audio: Uint8Array): Promise<SttResult> {
  const fd = new FormData();
  fd.append('file', new Blob([audio], { type: 'audio/webm' }), 'audio.webm');
  fd.append('model', model);
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  if (!res.ok) return { ok: false, err: classifyStatus(res.status, await res.text(), res.headers) };
  const j = await res.json();
  return { ok: true, text: j.text ?? '' };
}

async function deepgram(key: string, model: string, audio: Uint8Array): Promise<SttResult> {
  const res = await fetch(`https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model || 'nova-2')}&smart_format=true`, {
    method: 'POST', headers: { Authorization: `Token ${key}`, 'Content-Type': 'audio/webm' }, body: audio,
  });
  if (!res.ok) return { ok: false, err: classifyStatus(res.status, await res.text(), res.headers) };
  const j = await res.json();
  return { ok: true, text: j?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '' };
}

async function assemblyai(key: string, audio: Uint8Array): Promise<SttResult> {
  const up = await fetch('https://api.assemblyai.com/v2/upload', { method: 'POST', headers: { authorization: key }, body: audio });
  if (!up.ok) return { ok: false, err: classifyStatus(up.status, await up.text(), up.headers) };
  const { upload_url } = await up.json();
  const tr = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST', headers: { authorization: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_url: upload_url }),
  });
  if (!tr.ok) return { ok: false, err: classifyStatus(tr.status, await tr.text(), tr.headers) };
  const { id } = await tr.json();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const p = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: { authorization: key } });
    if (!p.ok) return { ok: false, err: classifyStatus(p.status, await p.text(), p.headers) };
    const j = await p.json();
    if (j.status === 'completed') return { ok: true, text: j.text ?? '' };
    if (j.status === 'error') return { ok: false, err: classifyStatus(400, j.error ?? 'Transcription failed', new Headers()) };
  }
  return { ok: false, err: classifyThrown(new Error('timeout: AssemblyAI did not finish in 40s')) };
}

async function callPersonal(provider: string, key: string, model: string, audio: Uint8Array): Promise<SttResult> {
  try {
    switch (provider) {
      case 'groq_whisper': return await whisperStyle('https://api.groq.com/openai/v1/audio/transcriptions', key, model || 'whisper-large-v3-turbo', audio);
      case 'openai_whisper': return await whisperStyle('https://api.openai.com/v1/audio/transcriptions', key, model || 'whisper-1', audio);
      case 'deepgram': return await deepgram(key, model, audio);
      case 'assemblyai': return await assemblyai(key, audio);
      default: return { ok: false, err: classifyStatus(400, `Unsupported provider ${provider}`, new Headers()) };
    }
  } catch (e) {
    return { ok: false, err: classifyThrown(e) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    const audio = decodeBase64(parsed.data.audio);

    // 1) The signed-in user's own speech-to-text keys, in their order.
    const uid = await userIdFromAuth(authHeader).catch(() => null);
    const failed: string[] = [];
    if (uid) {
      const keys = await getUserKeys(uid, 'stt');
      for (const k of keys) {
        const r = await callPersonal(k.cred.provider, k.key, k.model, audio);
        await noteKeyOutcome(uid, k.cred, 'stt', r.ok ? null : r.err);
        if (r.ok) return json({ text: r.text, provider: k.cred.provider, model: k.model, byok: true });
        failed.push(`${k.cred.provider} (${r.err.kind})`);
        if (r.err.kind === 'safety_refusal' || r.err.kind === 'bad_audio') {
          return json({ error: r.err.message, kind: r.err.kind, provider: k.cred.provider }, 422);
        }
      }
      if (failed.length && !(await platformFallbackAllowed(uid))) {
        return json({ error: `Your speech-to-text providers failed: ${failed.join(', ')}. Built-in fallback is turned off.`, byok_failed: failed }, 502);
      }
    }

    // 2) Built-in platform key.
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) return json({ error: 'Speech-to-text is not configured', byok_failed: failed }, 503);
    const r = await whisperStyle('https://api.openai.com/v1/audio/transcriptions', OPENAI_API_KEY, 'whisper-1', audio);
    if (!r.ok) {
      console.error('Platform STT error:', r.err.kind, r.err.status);
      return json({ error: r.err.message, kind: r.err.kind, byok_failed: failed }, r.err.status && r.err.status >= 400 ? r.err.status : 502);
    }
    return json({ text: r.text, provider: 'platform_openai', model: 'whisper-1', byok: false, fallback_used: failed.length > 0, byok_failed: failed });
  } catch (error) {
    console.error('Speech-to-text error:', error instanceof Error ? error.message : error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
