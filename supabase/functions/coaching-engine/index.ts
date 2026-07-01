// coaching-engine — computes per-participant radar scores and writes coaching tips.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// Deterministic scoring — mirrors src/lib/scoring/radar-score.ts.
function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function scale(v: number, min: number, max: number) {
  if (max === min) return 50;
  return clamp(((v - min) / (max - min)) * 100);
}

function radar(i: any) {
  const wordsPerTurn = i.avg_words_per_turn ?? 15;
  const novelty = i.novelty_avg ?? 0.5;
  const duplicates = i.duplicate_flags ?? 0;
  const fallacies = i.fallacy_count ?? 0;
  const supported = i.fact_supported ?? 0;
  const disputed = i.fact_disputed ?? 0;
  const unverifiable = i.fact_unverifiable ?? 0;
  const totalClaims = supported + disputed + unverifiable;
  const pos = i.positive_ratio ?? 0.5;
  const neg = i.negative_ratio ?? 0.2;
  const regulated = i.regulated_ratio ?? 0.6;
  const speaking = i.speaking_seconds ?? 0;
  const fairShare = i.fair_share_seconds ?? Math.max(60, speaking);
  const intGiven = i.interruptions_given ?? 0;
  const initiated = i.turns_initiated ?? 0;
  const invited = i.invitations_offered ?? 0;

  const clarity = clamp(scale(wordsPerTurn, 4, 45) * 0.7 + (1 - Math.min(1, duplicates / 4)) * 30);
  const reasoning = clamp(novelty * 70 + (1 - Math.min(1, fallacies / 5)) * 30);
  const shareRatio = fairShare > 0 ? Math.min(1.5, speaking / fairShare) : 1;
  const shareScore = 100 - Math.min(100, Math.abs(1 - shareRatio) * 120);
  const collaboration = clamp(shareScore * 0.7 + (1 - Math.min(1, intGiven / 5)) * 30);
  const evidence = totalClaims === 0
    ? 55
    : clamp((supported / totalClaims) * 80 + (1 - disputed / totalClaims) * 20);
  const ei = clamp(pos * 40 + regulated * 40 + (1 - Math.min(1, neg)) * 20 - Math.min(20, intGiven * 3));
  const leadership = clamp(scale(initiated, 0, 6) * 0.5 + scale(invited, 0, 4) * 0.4);
  const overall = Number(((clarity + reasoning + collaboration + evidence + ei + leadership) / 6).toFixed(1));

  return {
    clarity: Number(clarity.toFixed(1)),
    reasoning: Number(reasoning.toFixed(1)),
    collaboration: Number(collaboration.toFixed(1)),
    evidence: Number(evidence.toFixed(1)),
    emotional_intelligence: Number(ei.toFixed(1)),
    leadership: Number(leadership.toFixed(1)),
    overall,
  };
}

const AXIS_COPY: Record<string, { h: string; b: string }> = {
  clarity: { h: 'Tighten your delivery', b: 'Aim for 15–25 words per turn — one clear claim + one reason.' },
  reasoning: { h: 'Bring a fresh angle', b: 'Before speaking, ask "what have others missed?" and open with that.' },
  collaboration: { h: 'Share the floor', b: 'Invite a quieter participant in with "What do you think, [name]?" every 2–3 turns.' },
  evidence: { h: 'Back claims with evidence', b: 'Cite a number, source, or example every time you make an absolute statement.' },
  emotional_intelligence: { h: 'Regulate tone under pressure', b: 'Pause, name the concern, then respond — that swings sentiment back.' },
  leadership: { h: 'Take initiative earlier', b: 'Open with a framing move: "Here are the three angles we should cover…"' },
};

function generateTips(score: any) {
  const axes = ['clarity','reasoning','collaboration','evidence','emotional_intelligence','leadership'] as const;
  const weak = axes
    .map((a) => ({ a, v: score[a] as number }))
    .filter((x) => x.v < 60)
    .sort((a, b) => a.v - b.v);

  if (!weak.length) return [{
    category: 'reinforce', priority: 3,
    headline: 'Keep doing what you did',
    body: "You scored ≥ 60 on every axis. Next session, push for depth on your weakest area to break past 80.",
    evidence: { overall: score.overall },
  }];

  return weak.slice(0, 3).map((w, idx) => ({
    category: w.a,
    priority: (idx === 0 ? 1 : idx === 1 ? 2 : 3) as 1 | 2 | 3,
    headline: AXIS_COPY[w.a].h,
    body: AXIS_COPY[w.a].b,
    evidence: { axis: w.a, score: w.v },
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Pull participants
    const { data: participants } = await supabase
      .from('gd_participants')
      .select('id, real_user_id')
      .eq('session_id', session_id);

    const results: any[] = [];

    for (const p of participants ?? []) {
      const uid = p.real_user_id;
      if (!uid) continue;

      // Aggregate raw signals in parallel
      const [{ data: msgs }, { data: dup }, { data: fal }, { data: fc }, { data: behaviour }] =
        await Promise.all([
          supabase.from('gd_messages').select('content, duration_ms').eq('session_id', session_id).eq('participant_id', p.id),
          supabase.from('duplicate_ideas').select('id, duplicate_message_id').eq('session_id', session_id),
          supabase.from('fallacies').select('id, message_id').eq('session_id', session_id),
          supabase.from('fact_checks').select('verdict, message_id').eq('session_id', session_id),
          supabase.from('participant_behaviour').select('*').eq('session_id', session_id).eq('user_id', uid).maybeSingle(),
        ]);

      const words = (msgs ?? []).reduce((s, m) => s + (m.content ?? '').split(/\s+/).filter(Boolean).length, 0);
      const turns = (msgs ?? []).length;
      const avg_words_per_turn = turns > 0 ? words / turns : 0;
      const speaking_seconds = (msgs ?? []).reduce((s, m) => s + Math.round((m.duration_ms ?? 0) / 1000), 0);

      const supported = (fc ?? []).filter((c: any) => c.verdict === 'supported').length;
      const disputed = (fc ?? []).filter((c: any) => c.verdict === 'disputed').length;
      const unverifiable = (fc ?? []).filter((c: any) => c.verdict === 'unverifiable').length;

      const inputs = {
        speaking_seconds,
        fair_share_seconds: behaviour?.fair_share_seconds ?? Math.max(60, speaking_seconds),
        interruptions_given: behaviour?.interruptions_given ?? 0,
        interruptions_received: behaviour?.interruptions_received ?? 0,
        avg_words_per_turn,
        novelty_avg: behaviour?.novelty_avg ?? 0.5,
        duplicate_flags: (dup ?? []).length,
        fallacy_count: (fal ?? []).length,
        fact_supported: supported,
        fact_disputed: disputed,
        fact_unverifiable: unverifiable,
        positive_ratio: behaviour?.positive_ratio ?? 0.5,
        negative_ratio: behaviour?.negative_ratio ?? 0.2,
        regulated_ratio: behaviour?.regulated_ratio ?? 0.6,
        turns_initiated: behaviour?.turns_initiated ?? 0,
        invitations_offered: behaviour?.invitations_offered ?? 0,
      };

      const score = radar(inputs);

      await supabase.from('session_scores').upsert(
        { session_id, user_id: uid, ...score, computed_at: new Date().toISOString() },
        { onConflict: 'session_id,user_id' },
      );

      const tips = generateTips(score).map((t) => ({ session_id, user_id: uid, ...t }));
      if (tips.length) await supabase.from('coaching_tips').insert(tips);

      results.push({ user_id: uid, score, tip_count: tips.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('coaching-engine error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
