// AI CTR Predictor — heuristic + AI-scored predicted CTR for an ad
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { callAI } from "../_shared/ai-with-fallback.ts";
import { requireRole } from "../_shared/auth-guard.ts";

interface Req {
  headline: string;
  description?: string;
  cta?: string;
  media_type?: 'image' | 'video' | 'html';
  placement?: string;
  historical_ctr?: number; // 0..1
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authRes = await requireRole(req, ['editor', 'admin', 'analyst']);
    if (authRes instanceof Response) return authRes;
    const body = (await req.json()) as Req;
    if (!body.headline) {
      return new Response(JSON.stringify({ error: 'headline is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Heuristic baseline
    let base = 0.015;
    if (body.headline.length <= 40) base += 0.005;
    if (/\?|!/.test(body.headline)) base += 0.003;
    if (body.cta && body.cta.length <= 15) base += 0.004;
    if (body.media_type === 'video') base += 0.006;
    if (body.historical_ctr && body.historical_ctr > 0) base = base * 0.4 + body.historical_ctr * 0.6;

    // AI adjustment: quality score 0.5..1.5
    let quality = 1.0;
    let rationale = 'Heuristic baseline';
    try {
      const ai = await callAI({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Rate ad copy quality. Return strict JSON.' },
          {
            role: 'user',
            content: `Rate this ad. Return {"quality":0.5-1.5,"rationale":"one sentence"}.
Headline: ${body.headline}
Description: ${body.description ?? ''}
CTA: ${body.cta ?? ''}
Media: ${body.media_type ?? 'image'}`,
          },
        ],
        temperature: 0.2,
      });
      const raw = ai.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (typeof parsed.quality === 'number') quality = Math.max(0.5, Math.min(1.5, parsed.quality));
      if (typeof parsed.rationale === 'string') rationale = parsed.rationale;
    } catch { /* keep defaults */ }

    const predicted = Math.min(0.25, base * quality);
    return new Response(JSON.stringify({ predicted_ctr: predicted, quality_score: quality, rationale, baseline: base }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
