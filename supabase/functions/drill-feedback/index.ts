import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured logging helper
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'drill-feedback',
    message,
    ...data,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// Input validation schema
const inputSchema = z.object({
  drill_type: z.enum(['opening_statement', 'star_response', 'rebuttal', 'time_boxed']),
  topic: z.string().min(1).max(500, 'Topic too long (max 500 chars)'),
  user_response: z.string().min(1).max(5000, 'Response too long (max 5000 chars)'),
  time_limit_seconds: z.number().min(10).max(600).optional(),
  scenario: z.string().max(1000).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  let drillType = 'unknown';

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const rawBody = await req.json();
    const parseResult = inputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      log('warn', 'Input validation failed', { issues: parseResult.error.issues as unknown as Record<string, unknown> });
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { drill_type, topic, user_response, time_limit_seconds, scenario } = parseResult.data;
    drillType = drill_type;

    log('info', 'Processing drill feedback', { drill_type, topic_length: topic.length, response_length: user_response.length });

    // Content moderation
    const BLOCKED = [/\b(hate\s+speech|kill\s+all|death\s+to)\b/i, /\b(racial\s+slur|ethnic\s+cleansing)\b/i, /\b(bomb\s+threat|shoot\s+up|mass\s+murder)\b/i];
    for (const pattern of BLOCKED) {
      if (pattern.test(user_response) || pattern.test(topic)) {
        log('warn', 'Content moderation blocked drill input', { drill_type });
        return new Response(
          JSON.stringify({ score: 0, strengths: [], improvements: ["Your response was flagged for inappropriate content. Please rephrase."], specific_tip: "Keep responses professional and appropriate." }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let systemPrompt = '';
    
    switch (drill_type) {
      case 'opening_statement':
        systemPrompt = `You are an expert GD coach evaluating opening statements. Assess the user's opening for:
- Clear position/stance
- Strong hook/attention-grabber
- Concise delivery (30-60 seconds optimal)
- Confidence and authority

Provide a score (0-100), specific feedback, and one actionable improvement tip.`;
        break;
        
      case 'star_response':
        systemPrompt = `You are an expert interviewer evaluating STAR responses. Assess for:
- Situation: Clear context provided
- Task: Specific challenge/responsibility defined
- Action: Concrete steps taken
- Result: Measurable outcome stated

Score each component (0-25) and provide specific examples of what's missing.`;
        break;
        
      case 'rebuttal':
        systemPrompt = `You are a debate coach evaluating rebuttals and counterarguments. Assess for:
- Professional disagreement (not personal)
- Evidence-backed counter-points
- Logical structure
- Respectful tone

Provide score (0-100), highlight strong counter-arguments, and suggest improvements.`;
        break;
        
      case 'time_boxed':
        systemPrompt = `You are a speaking coach evaluating time-boxed responses. Assess for:
- Content completeness within time limit
- Pacing and clarity
- No rushed/rambling sections
- Strong opening and closing

Provide score (0-100), time management feedback, and pacing tips.`;
        break;
    }

    const scenarioContext = scenario ? `\nScenario Context: ${scenario}\nEvaluate the response specifically in the context of this scenario. Did they address the scenario appropriately?\n` : '';

    const userMessage = `Topic: ${topic}
${time_limit_seconds ? `Time Limit: ${time_limit_seconds} seconds` : ''}
${scenarioContext}
User's Response:
"${user_response}"

Provide detailed feedback as JSON:
{
  "score": number (0-100),
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "specific_tip": "one actionable tip",
  "example": "example of how to improve (optional)"
}`;

    const aiStartTime = performance.now();
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
      }),
    });
    const aiLatencyMs = Math.round(performance.now() - aiStartTime);

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'AI Gateway error', { status: response.status, error: errorText, ai_latency_ms: aiLatencyMs });
      throw new Error(`AI failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let feedback;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      feedback = JSON.parse(jsonMatch[1]);
    } catch (e) {
      log('warn', 'Failed to parse AI feedback JSON', { raw_content_length: content.length });
      feedback = {
        score: 70,
        strengths: ["Good attempt at the exercise"],
        improvements: ["Focus on structure and clarity"],
        specific_tip: "Practice more to improve confidence"
      };
    }

    const totalLatencyMs = Math.round(performance.now() - startTime);
    log('info', 'Drill feedback generated', { 
      drill_type: drillType, 
      score: feedback.score, 
      ai_latency_ms: aiLatencyMs, 
      total_latency_ms: totalLatencyMs 
    });

    return new Response(
      JSON.stringify(feedback),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalLatencyMs = Math.round(performance.now() - startTime);
    log('error', 'Drill feedback error', { 
      drill_type: drillType, 
      error: error instanceof Error ? error.message : 'Unknown', 
      total_latency_ms: totalLatencyMs 
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
