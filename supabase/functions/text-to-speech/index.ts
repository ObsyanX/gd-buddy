import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { userIdFromAuth } from "../_shared/ai/request-user.ts";
import { getUserKeys, noteKeyOutcome, platformFallbackAllowed } from "../_shared/ai/router.ts";
import { classifyStatus, classifyThrown } from "../_shared/ai/errors.ts";

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
  }
  return btoa(s);
}

const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

// Calls one of the user's own voice providers. Always returns MP3 audio on success.
async function callPersonalVoice(provider: string, key: string, model: string, text: string, voice: string | undefined, elevenVoiceId: string): Promise<Response> {
  if (provider === 'elevenlabs') {
    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({ text, model_id: model || 'eleven_turbo_v2_5', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
  }
  if (provider === 'openai_tts') {
    const v = OPENAI_VOICES.includes((voice || '').toLowerCase()) ? voice!.toLowerCase() : 'alloy';
    return fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || 'gpt-4o-mini-tts', voice: v, input: text, response_format: 'mp3' }),
    });
  }
  if (provider === 'google_tts') {
    const name = model || 'en-US-Neural2-F';
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: name.split('-').slice(0, 2).join('-'), name }, audioConfig: { audioEncoding: 'MP3' } }),
    });
    if (!r.ok) return r;
    const j = await r.json();
    const bin = Uint8Array.from(atob(j.audioContent ?? ''), (c) => c.charCodeAt(0));
    return new Response(bin, { status: 200 });
  }
  if (provider === 'sarvam_tts') {
    return callSarvam(key, model || 'bulbul:v2', text, voice);
  }
  return new Response('Unsupported voice provider', { status: 400 });
}

// Sarvam bulbul:v2 speakers. Female: anushka, manisha, vidya, arya. Male: abhilash, karun, hitesh.
const SARVAM_MALE = new Set(['echo', 'onyx', 'fable', 'roger', 'george', 'callum', 'liam', 'will', 'eric', 'chris', 'brian', 'daniel', 'bill', 'charlie', 'river']);
const SARVAM_MALE_SPEAKERS = ['abhilash', 'karun', 'hitesh'];
const SARVAM_FEMALE_SPEAKERS = ['anushka', 'manisha', 'vidya', 'arya'];
function sarvamSpeaker(voice?: string): string {
  const v = (voice || '').toLowerCase();
  const pool = SARVAM_MALE.has(v) ? SARVAM_MALE_SPEAKERS : SARVAM_FEMALE_SPEAKERS;
  let h = 0;
  for (const c of v) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

// Split at sentence boundaries into chunks Sarvam accepts (max 1500 chars per request).
function chunkText(text: string, max = 1400): string[] {
  const parts = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = ''; }
    cur += p.length > max ? p.slice(0, max) : p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Joins WAV files with identical formats: keeps the first header, appends the raw sample data.
function concatWav(wavs: Uint8Array[]): Uint8Array {
  if (wavs.length === 1) return wavs[0];
  const dataOf = (w: Uint8Array) => {
    const dv = new DataView(w.buffer, w.byteOffset, w.byteLength);
    let off = 12;
    while (off + 8 <= w.length) {
      const id = String.fromCharCode(w[off], w[off + 1], w[off + 2], w[off + 3]);
      const size = dv.getUint32(off + 4, true);
      if (id === 'data') return { start: off + 8, header: w.subarray(0, off + 8), size: Math.min(size, w.length - off - 8) };
      off += 8 + size;
    }
    return { start: 44, header: w.subarray(0, 44), size: w.length - 44 };
  };
  const first = dataOf(wavs[0]);
  const chunks = wavs.map((w) => { const d = dataOf(w); return w.subarray(d.start, d.start + d.size); });
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(first.header.length + total);
  out.set(first.header, 0);
  let pos = first.header.length;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  const dv = new DataView(out.buffer);
  dv.setUint32(4, out.length - 8, true);
  dv.setUint32(first.header.length - 4, total, true);
  return out;
}

async function callSarvam(key: string, model: string, text: string, voice?: string): Promise<Response> {
  const speaker = sarvamSpeaker(voice);
  const lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
  const wavs: Uint8Array[] = [];
  for (const piece of chunkText(text)) {
    const r = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: piece, target_language_code: lang, speaker, model, enable_preprocessing: true }),
    });
    if (!r.ok) return r;
    const j = await r.json();
    const b64 = j?.audios?.[0];
    if (!b64) return new Response('Sarvam returned no audio', { status: 502 });
    wavs.push(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  }
  return new Response(concatWav(wavs), { status: 200, headers: { 'x-audio-format': 'wav' } });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  text: z.string().min(1, 'Text required').max(5000, 'Text too long (max 5000 chars)'),
  voice: z.string().max(50).optional(),
});

// ElevenLabs voice mapping
const VOICE_MAP: Record<string, string> = {
  // Legacy OpenAI voice names mapped to similar ElevenLabs voices
  'alloy': 'EXAVITQu4vr4xnSDxMaL',     // Sarah
  'echo': 'JBFqnCBsd6RMkjVDRZzb',      // George
  'fable': 'XrExE9yKIg1WjnnlVkGX',     // Matilda
  'onyx': 'onwK4e9ZLuTAKqWW03F9',      // Daniel
  'nova': 'pFZP5JQG7iQjIQuC4Bku',      // Lily
  'shimmer': 'cgSgspJ2msm6clMCkdW9',   // Jessica
  // ElevenLabs native voices
  'aria': '9BWtsMINqrJLrRacOk9x',
  'roger': 'CwhRBWXzGAHq8TQ4Fs17',
  'sarah': 'EXAVITQu4vr4xnSDxMaL',
  'laura': 'FGY2WhTYpPnrIDTdsKH5',
  'charlie': 'IKne3meq5aSn9XLyUdCD',
  'george': 'JBFqnCBsd6RMkjVDRZzb',
  'callum': 'N2lVS1w4EtoT3dr4eOWO',
  'river': 'SAz9YHcvj6GT2YYXdXww',
  'liam': 'TX3LPaxmHKxFdv7VOQHJ',
  'charlotte': 'XB0fDUnXU5powFXDhCwa',
  'alice': 'Xb7hH8MSUJpSbSDYk0k2',
  'matilda': 'XrExE9yKIg1WjnnlVkGX',
  'will': 'bIHbv24MWmeRgasZH58o',
  'jessica': 'cgSgspJ2msm6clMCkdW9',
  'eric': 'cjVigY5qzO86Huf0OWal',
  'chris': 'iP95p4xoKVk53GoZ742B',
  'brian': 'nPczCjzI2devNBz1zQrb',
  'daniel': 'onwK4e9ZLuTAKqWW03F9',
  'lily': 'pFZP5JQG7iQjIQuC4Bku',
  'bill': 'pqHfZKP75CvOlQylNhV4',
};

// Map request voice names to Gemini-TTS prebuilt voices (Lovable AI fallback)
const GEMINI_VOICE_MAP: Record<string, string> = {
  alloy: 'Kore', echo: 'Charon', fable: 'Aoede', onyx: 'Fenrir', nova: 'Leda', shimmer: 'Callirrhoe',
  aria: 'Achernar', roger: 'Algenib', sarah: 'Kore', laura: 'Aoede', charlie: 'Puck',
  george: 'Charon', callum: 'Orus', river: 'Zephyr', liam: 'Iapetus', charlotte: 'Vindemiatrix',
  alice: 'Gacrux', matilda: 'Aoede', will: 'Rasalgethi', jessica: 'Callirrhoe', eric: 'Algieba',
  chris: 'Schedar', brian: 'Sadaltager', daniel: 'Fenrir', lily: 'Leda', bill: 'Enceladus',
};

// Fallback: Lovable AI Gateway TTS (Gemini) — returns a WAV ArrayBuffer or null.
async function callLovableTTS(text: string, voice?: string): Promise<ArrayBuffer | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return null;
  const voiceName = GEMINI_VOICE_MAP[(voice || '').toLowerCase()] || 'Kore';
  try {
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-tts-preview',
        stream_format: 'audio',
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      }),
    });
    if (!resp.ok) {
      console.warn('Lovable TTS fallback failed:', resp.status, await resp.text().catch(() => ''));
      return null;
    }
    return await resp.arrayBuffer();
  } catch (e) {
    console.warn('Lovable TTS fallback error:', e);
    return null;
  }
}

// Helper to call ElevenLabs API with a specific key
async function callElevenLabs(apiKey: string, text: string, voiceId: string): Promise<Response> {
  return await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }


  try {
    // Platform ElevenLabs keys (optional — personal keys and backups may serve instead)
    const apiKeys = [
      Deno.env.get('ELEVENLABS_API_KEY'),
      Deno.env.get('ELEVENLABS_API_KEY_1'),
    ].filter(Boolean) as string[];

    // Validate input
    const rawBody = await req.json();
    const parseResult = inputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.issues);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voice } = parseResult.data;

    // Get voice ID from mapping or use Sarah as default
    const voiceId = VOICE_MAP[voice?.toLowerCase() || ''] || VOICE_MAP['sarah'];

    // --- Personal voice keys (BYOK) first ---
    const uid = await userIdFromAuth(authHeader).catch(() => null);
    if (uid) {
      const personal = await getUserKeys(uid, 'voice').catch(() => []);
      for (const p of personal) {
        const started = Date.now();
        try {
          const r = await callPersonalVoice(p.cred.provider, p.key, p.model, text, voice, voiceId);
          if (r.ok) {
            const buf = new Uint8Array(await r.arrayBuffer());
            await noteKeyOutcome(uid, p.cred, 'voice', null);
            return new Response(
              JSON.stringify({ audioContent: toBase64(buf), audioFormat: 'mp3', provider: p.cred.provider, model: p.model, byok: true, latencyMs: Date.now() - started }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
          await noteKeyOutcome(uid, p.cred, 'voice', classifyStatus(r.status, await r.text(), r.headers));
        } catch (e) {
          await noteKeyOutcome(uid, p.cred, 'voice', classifyThrown(e));
        }
      }
      if (personal.length && !(await platformFallbackAllowed(uid))) {
        return new Response(
          JSON.stringify({ fallback: true, message: 'Your voice providers failed and platform fallback is off', provider_failed: personal.map((p) => p.cred.provider) }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    console.log(`Generating speech with ElevenLabs for: "${text.substring(0, 50)}..." with voice: ${voice || 'sarah'} (${voiceId})`);

    let response: Response | null = null;
    let lastError: string = '';

    // Try each API key until one works
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      console.log(`Trying ElevenLabs API key ${i + 1} of ${apiKeys.length}`);
      
      try {
        response = await callElevenLabs(apiKey, text, voiceId);
        
        if (response.ok) {
          console.log(`Success with API key ${i + 1}`);
          break;
        } else {
          lastError = await response.text();
          console.warn(`API key ${i + 1} failed:`, response.status, lastError);
          response = null;
        }
      } catch (fetchError) {
        console.warn(`API key ${i + 1} fetch error:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : 'Fetch failed';
        response = null;
      }
    }

    if (!response || !response.ok) {
      // ElevenLabs failed for all keys (e.g. quota exhausted) — fall back to Lovable AI TTS
      const fallbackAudio = await callLovableTTS(text, voice);
      if (fallbackAudio && fallbackAudio.byteLength > 0) {
        console.log('Lovable TTS fallback succeeded, audio size:', fallbackAudio.byteLength);
        const fbBytes = new Uint8Array(fallbackAudio);
        const chunkSize = 8192;
        let fbBase64 = '';
        for (let i = 0; i < fbBytes.length; i += chunkSize) {
          const chunk = fbBytes.subarray(i, Math.min(i + chunkSize, fbBytes.length));
          fbBase64 += String.fromCharCode.apply(null, Array.from(chunk));
        }
        return new Response(
          JSON.stringify({ audioContent: btoa(fbBase64), audioFormat: 'wav', provider: 'lovable' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Return 200 with fallback flag to avoid client runtime popups from 5xx responses
      return new Response(
        JSON.stringify({
          fallback: true,
          message: 'ElevenLabs unavailable',
          detail: lastError.substring(0, 200)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert audio buffer to base64 in chunks to avoid stack overflow
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Process in chunks to avoid "Maximum call stack size exceeded"
    const chunkSize = 8192;
    let base64Audio = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      base64Audio += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64Audio = btoa(base64Audio);

    console.log('Speech generation complete, audio size:', arrayBuffer.byteLength);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
