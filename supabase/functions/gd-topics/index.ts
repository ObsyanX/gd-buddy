import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category definitions with specific instructions
const CATEGORY_PROMPTS: Record<string, { name: string; instruction: string; focus: string }> = {
  factual: {
    name: "Factual Topics",
    instruction: "Generate topics based on facts, data, statistics, or real events. These should test awareness and knowledge of current affairs.",
    focus: "Include topics that require knowledge of statistics, data, and real-world developments. Topics should be verifiable and fact-based."
  },
  conceptual: {
    name: "Conceptual / Abstract Topics",
    instruction: "Generate topics based on ideas, concepts, or philosophical questions. There should be no right or wrong answer.",
    focus: "Focus on topics that test thinking, interpretation, and logical reasoning. These are debate-worthy ideas without definitive answers."
  },
  controversial: {
    name: "Controversial Topics",
    instruction: "Generate topics with strong arguments on both sides. These test emotional control, balanced reasoning, and respectful debate skills.",
    focus: "Include topics where reasonable people can strongly disagree. Participants must stay calm and present balanced views."
  },
  "case-study": {
    name: "Case Study-Based Topics",
    instruction: "Generate real-life business or workplace scenarios that require problem-solving and decision-making.",
    focus: "Present situations like company challenges, ethical dilemmas, or management decisions. Focus on testing teamwork and leadership skills."
  },
  "current-affairs": {
    name: "Current Affairs Topics",
    instruction: "Generate topics related to recent national and international events, policies, and developments.",
    focus: "Include recent political, economic, technological, and social developments. Topics should be timely and relevant."
  },
  opinion: {
    name: "Opinion-Based Topics",
    instruction: "Generate topics where participants must express and defend personal viewpoints and perspectives.",
    focus: "Focus on topics that test confidence, communication skills, and the ability to articulate personal opinions clearly."
  },
  ethical: {
    name: "Ethical Topics",
    instruction: "Generate topics focusing on moral values, ethics, integrity, and difficult ethical decisions.",
    focus: "Include topics about corporate ethics, personal integrity, moral dilemmas, and values-based decisions."
  }
};

// Input validation schema
const inputSchema = z.object({
  audience: z.string().max(100).optional().default('general'),
  tone: z.string().max(50).optional().default('formal'),
  difficulty: z.string().max(50).optional().default('medium'),
  count: z.number().min(1).max(50).optional().default(6),
  category: z.string().max(50).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate input
    const rawBody = await req.json();
    const parseResult = inputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.issues);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audience, tone, difficulty, count, category } = parseResult.data;

    // Get category-specific instructions
    const categoryInfo = category ? CATEGORY_PROMPTS[category] : null;
    const categoryName = categoryInfo?.name || 'Mixed';
    const categoryInstruction = categoryInfo?.instruction || 'Generate diverse topics across different categories.';
    const categoryFocus = categoryInfo?.focus || 'Ensure topics are current, relevant, and debate-worthy.';

    console.log(`Generating ${count} ${categoryName} topics for ${audience}, ${difficulty} difficulty`);

    const systemPrompt = `You are TopicGen — an expert at creating engaging Group Discussion topics for interview practice.

Generate ${count} concise, interview-ready GD topics as JSON array.

CATEGORY: ${categoryName}
${categoryInstruction}

OUTPUT FORMAT (strict JSON only):
{
  "topics": [
    {
      "title": "string (max 12 words)",
      "category": "${categoryName}",
      "difficulty": "${difficulty}",
      "prompts": ["prompt1", "prompt2", "prompt3"],
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

RULES:
- Each title must be concise (≤12 words)
- Include exactly 3 discussion prompts per topic (questions to spark debate)
- Add 3-5 relevant tags
- All topics MUST be ${categoryName} type
- ${categoryFocus}
- Topics should be relevant to ${audience}
- ${tone === 'formal' ? 'Use professional, interview-appropriate language' : 'Use conversational, approachable language'}`;

    const userMessage = `Generate ${count} Group Discussion topics.
Category: ${categoryName}
Audience: ${audience}
Tone: ${tone}
Difficulty: ${difficulty}

Create engaging ${categoryName.toLowerCase()} that will spark meaningful discussion.`;

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
