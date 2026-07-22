// AI Ad Copy — generate ad headline + description variants
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { callAI } from "../_shared/ai-with-fallback.ts";
import { requireRole } from "../_shared/auth-guard.ts";

interface Req {
  product: string;
  audience?: string;
  goal?: string; // clicks | signups | awareness
  tone?: string;
  n?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authRes = await requireRole(req, ['editor', 'admin']);
    if (authRes instanceof Response) return authRes;
    const body = (await req.json()) as Req;
    if (!body.product) {
      return new Response(JSON.stringify({ error: 'product is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const n = Math.max(1, Math.min(8, body.n ?? 5));
    const ai = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You write high-converting ad copy. Return STRICT JSON only.' },
        {
          role: 'user',
          content: `Generate ${n} ad variants for:
Product: ${body.product}
Audience: ${body.audience ?? 'GD aspirants and job seekers'}
Goal: ${body.goal ?? 'clicks'}
Tone: ${body.tone ?? 'confident, benefit-driven'}

Return JSON: { "variants": [ { "headline": "≤40 chars", "description": "≤90 chars", "cta": "≤15 chars" } ] }
No code fences.`,
        },
      ],
      temperature: 0.9,
    });
    const raw = ai.choices?.[0]?.message?.content ?? '{}';
    let parsed: unknown = {};
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch { parsed = { raw }; }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
