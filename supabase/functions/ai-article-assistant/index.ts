// AI Article Assistant — generate outlines, drafts, improvements, SEO meta
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { callAI } from "../_shared/ai-with-fallback.ts";

interface Req {
  action: 'outline' | 'draft' | 'improve' | 'seo';
  topic?: string;
  title?: string;
  body?: string;
  audience?: string;
  tone?: string;
}

const SYSTEM = `You are an expert content writer for GD Buddy, a group discussion practice platform.
Write in clear, engaging, actionable prose. Prefer short paragraphs and scannable structure.`;

function prompt(input: Req): string {
  switch (input.action) {
    case 'outline':
      return `Create a detailed article outline (H2/H3 headings + 1-line summaries) for topic: "${input.topic}".
Audience: ${input.audience ?? 'GD aspirants'}. Tone: ${input.tone ?? 'friendly, expert'}.
Return markdown only.`;
    case 'draft':
      return `Write a full markdown article for topic: "${input.topic}".
Audience: ${input.audience ?? 'GD aspirants'}. Tone: ${input.tone ?? 'friendly, expert'}.
Target length: 800-1200 words. Include intro, 4-6 H2 sections, and a conclusion.`;
    case 'improve':
      return `Improve the following article: fix grammar, tighten prose, strengthen structure. Keep it markdown.
Title: ${input.title ?? ''}
---
${input.body ?? ''}`;
    case 'seo':
      return `Given this article, produce SEO metadata as strict JSON with keys: seo_title (<=60 chars), seo_description (<=155 chars), tags (array of 5-8 lowercase strings).
Title: ${input.title ?? ''}
Body: ${(input.body ?? '').slice(0, 4000)}
Return JSON only, no code fences.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Req;
    if (!body.action) {
      return new Response(JSON.stringify({ error: 'action is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const ai = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt(body) },
      ],
      temperature: body.action === 'seo' ? 0.2 : 0.7,
    });
    const content = ai.choices?.[0]?.message?.content ?? '';
    if (body.action === 'seo') {
      try {
        const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
        return new Response(JSON.stringify({ result: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ result: { raw: content } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ result: content }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
