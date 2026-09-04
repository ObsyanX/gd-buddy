// fallacy-detector — flags logical fallacies in an utterance and stores them.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireSessionAccess } from "../_shared/auth-guard.ts";
import { callAI } from "../_shared/ai-with-fallback.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FALLACY_TYPES = [
  'ad_hominem',
  'straw_man',
  'false_dilemma',
  'slippery_slope',
  'appeal_to_authority',
  'appeal_to_emotion',
  'hasty_generalization',
  'circular_reasoning',
  'red_herring',
  'bandwagon',
];

// Cheap pre-filter: skip the AI call for very short / clearly neutral text.
function likelyArgumentative(text: string): boolean {
  if (text.trim().split(/\s+/).length < 8) return false;
  return /(because|therefore|so |everyone|always|never|obviously|clearly|must|proves?|only way|if we)/i.test(text);
}

async function classify(content: string): Promise<any[]> {
  const prompt = `Identify logical fallacies in the utterance below.
Allowed fallacy_type values: ${FALLACY_TYPES.join(', ')}.
Return STRICT JSON: {"fallacies":[{"fallacy_type":"...","confidence":0-1,"explanation":"..."}]}.
If there are none, return {"fallacies":[]}.

Utterance: """${content}"""`;

  try {
    const data = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.fallacies) ? parsed.fallacies : [];
  } catch (e) {
    console.error('fallacy-detector AI failed', (e as Error).message);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { session_id, message_id, content } = await req.json();
    if (!session_id || !content) {
      return new Response(JSON.stringify({ error: 'session_id, content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authOrResp = await requireSessionAccess(req, session_id);
    if (authOrResp instanceof Response) return authOrResp;

    if (!likelyArgumentative(String(content))) {
      return new Response(JSON.stringify({ fallacies: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const rows = (await classify(String(content)))
      .filter((f: any) => f && FALLACY_TYPES.includes(f.fallacy_type))
      .slice(0, 5)
      .map((f: any) => ({
        session_id,
        message_id: message_id ?? null,
        fallacy_type: f.fallacy_type,
        confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0)),
        explanation: f.explanation ? String(f.explanation).slice(0, 800) : null,
      }))
      .filter((r: any) => r.confidence >= 0.5);

    if (rows.length) {
      const { error: insErr } = await supabase.from('fallacies').insert(rows);
      if (insErr) console.error('fallacy-detector insert error', insErr);
    }

    return new Response(JSON.stringify({ fallacies: rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fallacy-detector error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
