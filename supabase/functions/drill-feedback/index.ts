import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { callAI } from "../_shared/ai-with-fallback.ts";
import { parseAiJson } from "../_shared/parse-ai-json.ts";

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

// Offline scoring used when every AI provider is unavailable (credits/quota).
const FILLERS = /\b(um|uh|like|you know|basically|actually|literally|sort of|kind of)\b/gi;
function buildHeuristicFeedback(response: string, timeLimit?: number) {
  const words = response.trim().split(/\s+/).filter(Boolean);
  const sentences = response.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const fillerCount = (response.match(FILLERS) || []).length;
  const fillerRate = words.length ? fillerCount / words.length : 0;
  const avgSentence = sentences.length ? words.length / sentences.length : words.length;

  let score = 70;
  if (words.length >= 80) score += 8;
  else if (words.length < 30) score -= 12;
  if (sentences.length >= 4) score += 6;
  if (fillerRate > 0.05) score -= 12;
  else if (fillerRate === 0) score += 4;
  if (avgSentence > 30) score -= 6;
  score = Math.max(35, Math.min(92, Math.round(score)));

  const strengths: string[] = [];
  const improvements: string[] = [];
  if (words.length >= 60) strengths.push(`Solid length — ${words.length} words gives the panel enough substance.`);
  if (sentences.length >= 4) strengths.push("Your answer is broken into multiple clear points.");
  if (fillerCount === 0) strengths.push("No filler words detected — that reads as confident.");
  if (!strengths.length) strengths.push("You attempted the drill and got a response on record.");

  if (words.length < 60) improvements.push("Expand your answer — aim for 80-120 words with one concrete example.");
  if (fillerCount > 0) improvements.push(`Cut filler words (${fillerCount} found) — pause instead of saying them.`);
  if (avgSentence > 30) improvements.push("Shorten sentences; one idea per sentence is easier to follow.");
  if (!improvements.length) improvements.push("Add a crisp one-line conclusion to close strongly.");

  return {
    score,
    strengths,
    improvements,
    specific_tip: timeLimit
      ? `Rehearse hitting your key point within the first ${Math.round(timeLimit / 3)} seconds.`
      : "Open with your position, give one example, then close in a single line.",
    degraded: true,
    note: "AI coaching is temporarily unavailable, so this score is based on speech-structure analysis.",
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    let aiResponse;
    try {
      aiResponse = await callAI({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
      });
    } catch (aiError) {
      // Every provider unavailable (credits/quota): return heuristic feedback so
      // the drill still completes instead of failing with a 500.
      log('warn', 'AI unavailable, returning heuristic drill feedback', {
        error: aiError instanceof Error ? aiError.message : 'Unknown',
      });
      return new Response(
        JSON.stringify(buildHeuristicFeedback(user_response, time_limit_seconds)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const aiLatencyMs = Math.round(performance.now() - aiStartTime);
    log('info', 'AI call completed', { provider: aiResponse._provider, ai_latency_ms: aiLatencyMs });

    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify(buildHeuristicFeedback(user_response, time_limit_seconds)),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
    let feedback = parseAiJson<Record<string, unknown>>(jsonMatch[1]);
    if (!feedback) {
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
