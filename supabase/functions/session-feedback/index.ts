import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, conversation, metrics, videoMetrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert Group Discussion (GD) coach and communication skills evaluator. 
Analyze the participant's overall performance in this group discussion and provide detailed, personalized feedback.

Your feedback should be structured as a JSON object with these fields:
- "overall_rating": A rating from 1-10 (integer)
- "summary": A 2-3 sentence overall assessment (string)
- "communication": Feedback on communication style, clarity, and articulation (string, 2-3 sentences)
- "content_quality": Feedback on the quality of arguments, examples, and reasoning (string, 2-3 sentences)  
- "group_dynamics": Feedback on how well they engaged with others, built on points, and contributed to the discussion flow (string, 2-3 sentences)
- "body_language": If video metrics are provided, feedback on posture, eye contact, and expressions. Otherwise say "No video data available for this session." (string, 2-3 sentences)
- "tips": An array of 3-5 specific, actionable improvement tips (string array)

Be encouraging but honest. Reference specific moments from the conversation when possible.`;

    const userPrompt = `Topic: "${topic}"

Conversation transcript:
${conversation.map((m: any) => `${m.who}${m.is_user ? ' (participant being evaluated)' : ''}: ${m.text}`).join('\n')}

Performance Metrics:
- Words Per Minute: ${metrics.words_per_min || 'N/A'}
- Total Words: ${metrics.total_words || 'N/A'}
- Filler Word Count: ${metrics.filler_count || 0}
- Filler Rate: ${((metrics.fillerRate || 0) * 100).toFixed(1)}%
- Participation Rate: ${((metrics.participationRate || 0) * 100).toFixed(1)}%
- Average Response Length: ${metrics.avgResponseLength || 'N/A'} words
- Fluency Score: ${metrics.fluency_score ?? 'N/A'}/100
- Content Score: ${metrics.content_score ?? 'N/A'}/100
- Structure Score: ${metrics.structure_score ?? 'N/A'}/100
- Voice Score: ${metrics.voice_score ?? 'N/A'}/100
${videoMetrics ? `
Video Metrics:
- Posture Score: ${videoMetrics.postureScore}/100
- Eye Contact Score: ${videoMetrics.eyeContactScore}/100
- Expression Score: ${videoMetrics.expressionScore}/100` : 'No video metrics available.'}

Provide your structured feedback as JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_feedback",
              description: "Provide structured session feedback",
              parameters: {
                type: "object",
                properties: {
                  overall_rating: { type: "integer", minimum: 1, maximum: 10 },
                  summary: { type: "string" },
                  communication: { type: "string" },
                  content_quality: { type: "string" },
                  group_dynamics: { type: "string" },
                  body_language: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                },
                required: ["overall_rating", "summary", "communication", "content_quality", "group_dynamics", "body_language", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_feedback" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const feedback = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(feedback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return new Response(jsonMatch[0], {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Failed to parse AI feedback response");
  } catch (e) {
    console.error("session-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
