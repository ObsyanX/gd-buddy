import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { audience = 'general', tone = 'formal', difficulty = 'medium', count = 8 } = await req.json();

    console.log(`Generating ${count} topics for ${audience}, ${difficulty} difficulty, ${tone} tone`);

    const systemPrompt = `You are TopicGen — an expert at creating engaging Group Discussion topics for interview practice.

Generate ${count} concise, interview-ready GD topics as JSON array.

OUTPUT FORMAT (strict JSON only):
{
  "topics": [
    {
      "title": "string (max 12 words)",
      "category": "Technology|Business|Social|Current Affairs|Environment|Education|Politics|Ethics",
      "difficulty": "easy|medium|hard",
      "prompts": ["prompt1", "prompt2", "prompt3"],
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

RULES:
- Each title must be concise (≤12 words)
- Include exactly 3 discussion prompts per topic
- Add 3-5 relevant tags
- Match requested difficulty and tone
- Topics should be relevant to ${audience}
- ${tone === 'formal' ? 'Use professional, interview-appropriate language' : 'Use conversational, approachable language'}
- Ensure topics are current, relevant, and debate-worthy`;

    const userMessage = `Generate ${count} Group Discussion topics.
Audience: ${audience}
Tone: ${tone}
Difficulty: ${difficulty}

Create diverse topics across different categories that will spark meaningful discussion.`;

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
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from response
    let parsedResponse;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      parsedResponse = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse topic data');
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Topic generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});