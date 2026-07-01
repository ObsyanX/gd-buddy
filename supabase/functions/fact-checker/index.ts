// fact-checker — verifies factual claims in an utterance and stores results.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

async function callAI(prompt: string): Promise<string | null> {
  const body = {
    model: LOVABLE_API_KEY ? 'google/gemini-2.5-flash' : 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  };
  const url = LOVABLE_API_KEY
    ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const key = LOVABLE_API_KEY ?? GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { session_id, message_id, content } = await req.json();
    if (!session_id || !content) {
      return new Response(JSON.stringify({ error: 'session_id, content required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const prompt = `Extract each verifiable factual claim from the utterance below and rate each one.
Return STRICT JSON: {"claims":[{"claim":"...","verdict":"supported|disputed|unverifiable","confidence":0-1,"explanation":"...","sources":["url1"]}]}.
If there are no factual claims, return {"claims":[]}.

Utterance: """${content}"""`;

    const raw = await callAI(prompt);
    if (!raw) {
      return new Response(JSON.stringify({ claims: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let parsed: any = { claims: [] };
    try { parsed = JSON.parse(raw); } catch { /* keep empty */ }

    const rows = (parsed.claims ?? [])
      .filter((c: any) => c && typeof c.claim === 'string')
      .slice(0, 8)
      .map((c: any) => ({
        session_id,
        message_id: message_id ?? null,
        claim: String(c.claim).slice(0, 500),
        verdict: ['supported', 'disputed', 'unverifiable'].includes(c.verdict) ? c.verdict : 'unverifiable',
        confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0)),
        explanation: c.explanation ? String(c.explanation).slice(0, 800) : null,
        sources: Array.isArray(c.sources) ? c.sources.slice(0, 5) : [],
      }));

    if (rows.length) await supabase.from('fact_checks').insert(rows);

    return new Response(JSON.stringify({ claims: rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fact-checker error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
