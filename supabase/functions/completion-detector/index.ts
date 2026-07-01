// Completion detector — runs a fused AI + heuristic check and writes to `completion_signals`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

interface Utterance {
  text: string;
  duration_ms: number;
  ts: number;
  novelty?: number;
}

async function aiVerdict(topic: string, utterances: Utterance[]): Promise<{ confidence: number; reason: string } | null> {
  const transcript = utterances
    .slice(-12)
    .map((u, i) => `${i + 1}. ${u.text}`)
    .join('\n');

  const prompt = `Topic: "${topic}"\n\nTranscript (most recent last):\n${transcript}\n\nHas this group discussion reached a natural conclusion (consensus reached OR topic exhausted OR participants repeating)? Reply with STRICT JSON: {"confidence":0-1,"reason":"..."}`;

  const body = {
    model: LOVABLE_API_KEY ? 'google/gemini-2.5-flash' : 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  };

  try {
    const url = LOVABLE_API_KEY
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';
    const key = LOVABLE_API_KEY ?? GROQ_API_KEY;
    if (!key) return null;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    return { confidence, reason: String(parsed.reason ?? 'unknown') };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { session_id, silence_seconds = 0 } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: session } = await supabase
      .from('gd_sessions')
      .select('id, topic')
      .eq('id', session_id)
      .maybeSingle();

    const { data: messages } = await supabase
      .from('gd_messages')
      .select('content, duration_ms, end_ts')
      .eq('session_id', session_id)
      .order('end_ts', { ascending: false })
      .limit(12);

    const utterances: Utterance[] = (messages ?? [])
      .reverse()
      .map((m: any) => ({
        text: m.content ?? '',
        duration_ms: m.duration_ms ?? 0,
        ts: new Date(m.end_ts ?? Date.now()).getTime(),
      }));

    const verdict = await aiVerdict(session?.topic ?? '', utterances);

    // Heuristic score (mirrors evaluateCompletion but server-side)
    let score = 0;
    const evidence: Record<string, unknown> = { silence_seconds };

    if (verdict && verdict.confidence >= 0.6) {
      score += Math.min(0.4, verdict.confidence * 0.4);
      evidence.ai_confidence = verdict.confidence;
      evidence.ai_reason = verdict.reason;
    }
    if (silence_seconds >= 30) score += 0.15;

    const markers = utterances.slice(-3).filter((u) =>
      /(in conclusion|to summari[sz]e|final thoughts?|wrap(?:ping)? up|we (?:all )?agree|no (?:further|more) points?)/i.test(
        u.text,
      ),
    ).length;
    if (markers >= 1) score += 0.2;
    if (markers >= 2) score += 0.15;
    evidence.conclusion_markers = markers;

    const confidence = Math.min(1, Number(score.toFixed(2)));
    const acted = confidence >= 0.75;

    await supabase.from('completion_signals').insert({
      session_id,
      confidence,
      reason: acted ? 'natural_completion' : 'ongoing',
      evidence,
      acted_on: false,
    });

    return new Response(
      JSON.stringify({ confidence, reason: acted ? 'natural_completion' : 'ongoing', evidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('completion-detector error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
