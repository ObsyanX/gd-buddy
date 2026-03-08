import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch recent sessions with metrics
    const { data: sessions } = await supabase
      .from('gd_sessions')
      .select('id, topic, topic_category, created_at, gd_metrics(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent drills
    const { data: drills } = await supabase
      .from('skill_drills')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch skill progress
    const { data: skills } = await supabase
      .from('skill_progress')
      .select('*')
      .eq('user_id', user.id);

    // Build summary for AI
    const sessionSummary = (sessions || []).map((s: any) => {
      const m = s.gd_metrics?.[0];
      return {
        topic: s.topic,
        category: s.topic_category,
        date: s.created_at,
        fluency: m?.fluency_score,
        content: m?.content_score,
        structure: m?.structure_score,
        voice: m?.voice_score,
        fillers: m?.filler_count,
        wpm: m?.words_per_min,
      };
    });

    const drillSummary = (drills || []).map((d: any) => ({
      type: d.drill_type,
      topic: d.topic,
      score: d.score,
      date: d.created_at,
    }));

    const skillSummary = (skills || []).map((s: any) => ({
      skill: s.skill_name,
      score: s.current_score,
      level: s.level,
      minutes: s.total_practice_minutes,
    }));

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('Missing API key');

    const prompt = `You are a GD (Group Discussion) performance coach. Analyze this user's practice data and provide 3-5 actionable, specific insights.

Recent Sessions (last 10):
${JSON.stringify(sessionSummary, null, 2)}

Recent Drills:
${JSON.stringify(drillSummary, null, 2)}

Skill Progress:
${JSON.stringify(skillSummary, null, 2)}

Respond ONLY with a JSON array of objects, each with:
- "title": short insight title (max 8 words)
- "description": 1-2 sentence actionable advice
- "type": one of "strength", "improvement", "suggestion"
- "priority": 1-5 (1 = most important)

If no data, give general beginner tips. Sort by priority.`;

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
