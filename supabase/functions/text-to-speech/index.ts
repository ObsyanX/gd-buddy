import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
    // Get both API keys for failover
    const apiKeys = [
      Deno.env.get('ELEVENLABS_API_KEY'),
      Deno.env.get('ELEVENLABS_API_KEY_1'),
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      throw new Error('No ElevenLabs API keys configured');
    }

    const { text, voice } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Get voice ID from mapping or use Sarah as default
    const voiceId = VOICE_MAP[voice?.toLowerCase()] || VOICE_MAP['sarah'];

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
      throw new Error(`All ElevenLabs API keys failed. Last error: ${lastError}`);
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
