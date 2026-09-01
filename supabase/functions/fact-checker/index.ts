// fact-checker — verifies factual claims in an utterance and stores results.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireSessionAccess } from "../_shared/auth-guard.ts";
import { callAI } from "../_shared/ai-with-fallback.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function askAI(prompt: string): Promise<string | null> {
  try {
    const data = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('fact-checker AI failed', (e as Error).message);
    return null;
  }
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
    const authOrResp = await requireSessionAccess(req, session_id);
    if (authOrResp instanceof Response) return authOrResp;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const prompt = `Extract each verifiable factual claim from the utterance below and rate each one.
Return STRICT JSON: {"claims":[{"claim":"...","verdict":"supported|disputed|unverifiable","confidence":0-1,"explanation":"...","sources":["url1"]}]}.
If there are no factual claims, return {"claims":[]}.

Utterance: """${content}"""`;

    const raw = await askAI(prompt);
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
