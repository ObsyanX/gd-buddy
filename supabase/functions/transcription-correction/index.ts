import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const inputSchema = z.object({
  rawTranscription: z.string().max(5000, 'Transcription too long (max 5000 chars)'),
  context: z.string().max(500).optional(),
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

    const { rawTranscription, context } = parseResult.data;

    if (!rawTranscription || rawTranscription.trim().length === 0) {
      return new Response(
        JSON.stringify({ correctedText: rawTranscription || '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Correcting transcription:', rawTranscription);

    const systemPrompt = `You are a transcription correction AI specialized in fixing speech-to-text errors. Your task is to:

1. Fix common speech recognition errors (misheard words, homophones)
2. Handle code-switching languages seamlessly:
   - English
   - Hinglish (Hindi-English mix, e.g., "main think karta hoon" → "I think")
   - Benglish (Bengali-English mix)
   - Other South Asian English variants
3. Correct grammar and punctuation while preserving the speaker's intent
4. Handle common filler words appropriately (um, uh, like, you know)
5. Fix incomplete words or stutters

IMPORTANT RULES:
- Return ONLY the corrected text, no explanations
- Preserve the meaning and tone of the original
- If the transcription is already correct, return it as-is
- Convert mixed language to natural English when it makes the meaning clearer
- Keep technical terms and proper nouns intact
- Make the text natural and conversational`;

    const userPrompt = context 
      ? `Context: This is from a group discussion about "${context}"\n\nRaw transcription to correct:\n"${rawTranscription}"`
      : `Raw transcription to correct:\n"${rawTranscription}"`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      // Return original on error
      return new Response(
        JSON.stringify({ correctedText: rawTranscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const correctedText = data.choices?.[0]?.message?.content?.trim() || rawTranscription;

    console.log('Corrected transcription:', correctedText);

    return new Response(
      JSON.stringify({ correctedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription correction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
