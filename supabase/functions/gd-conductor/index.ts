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

    const body = await req.json();
    const { 
      session_id, 
      topic, 
      topic_meta = {}, 
      participants = [],
      conversation_history = [],
      latest_user_utterance = "",
      metrics_so_far = {},
      config = {},
      request: request_type = "generate_responses"
    } = body;

    console.log(`GD-Conductor: Processing ${request_type} for session ${session_id}`);

    // Build the system prompt
    const systemPrompt = `You are GD-Conductor — an AI that orchestrates realistic Group Discussion practice sessions. You control multiple AI participants with distinct personas.

Your job: Accept session state + user input → decide what each AI participant says (or remains silent) → mark interruptions/overlaps → produce concise, persona-consistent replies → provide invigilator feedback → output structured JSON with TTS metadata.

CRITICAL: Output ONLY valid JSON. No prose, no markdown, no explanations.

OUTPUT SCHEMA:
{
  "session_id": "string",
  "timestamp_iso": "ISO date",
  "request_handled": "generate_responses|invigilator_update|post_session_report|topic_suggestions",
  "participant_responses": [
    {
      "participant_id": "string",
      "text": "max ${config.max_reply_words || 40} words",
      "intent": "agree|elaborate|contradict|ask_question|summarize|counterpoint|example|clarify",
      "interruption": boolean,
      "overlap_seconds": number,
      "clip_strategy": "mix|fade_previous|cut_previous",
      "follow_up": "short suggestion",
      "tts_ssml": "<speak><voice name='...'><prosody rate='...' pitch='...'>text</prosody></voice></speak>",
      "voice": {"voice_name": "...", "rate_pct": 100, "pitch_pct": 0, "style": "..."},
      "confidence_estimate": number
    }
  ],
  "invigilator_signals": {
    "fluency_score": number,
    "filler_count": number,
    "avg_pause_s": number,
    "wpm": number,
    "clarity_issues": [],
    "live_hint": "string"
  },
  "session_updates": {
    "next_expected_speaker": "participant_id",
    "expected_duration_s": number
  }
}

RULES:
1. Keep replies under ${config.max_reply_words || 40} words, 1-3 sentences
2. User participants (is_user=true) are NEVER generated
3. Choose at most 2 AI participants to respond
4. Match persona tone/verbosity/vocab level
5. Mark interruptions based on persona.interrupt_level and config.interruption_mode
6. Generate valid SSML for TTS
7. Provide helpful invigilator feedback for the user
8. Be concise and interview-realistic`;

    // Build conversation context
    const conversationContext = conversation_history.map((turn: any) => 
      `${turn.who}: ${turn.text}`
    ).join('\n');

    const userMessage = `Topic: ${topic}
Category: ${topic_meta.category || 'General'}
Difficulty: ${topic_meta.difficulty || 'Medium'}

Participants:
${participants.map((p: any) => `- ${p.id} (${p.is_user ? 'USER' : 'AI'}): ${p.persona?.name || 'Participant'} - ${p.persona?.tone || 'neutral'} tone, ${p.persona?.verbosity || 'moderate'} verbosity`).join('\n')}

Recent conversation:
${conversationContext || 'No previous turns'}

Latest user utterance: "${latest_user_utterance}"

Request: ${request_type}

${request_type === 'generate_responses' ? 'Generate AI participant responses now.' : ''}
${request_type === 'invigilator_update' ? 'Provide invigilator feedback based on metrics.' : ''}
${request_type === 'post_session_report' ? 'Generate complete post-session analysis with scores, strengths, weaknesses, and improvement drills.' : ''}`;

    // Call Lovable AI
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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limit', message: 'AI rate limit exceeded. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'AI credits depleted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse JSON from response (handle potential markdown wrapping)
    let parsedResponse;
    try {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      parsedResponse = JSON.parse(jsonMatch[1]);
    } catch (e) {
      // If parsing fails, return a minimal valid response
      console.error('Failed to parse AI response:', e);
      parsedResponse = {
        session_id,
        timestamp_iso: new Date().toISOString(),
        request_handled: request_type,
        participant_responses: [],
        invigilator_signals: {
          live_hint: "Processing your input..."
        },
        session_updates: {}
      };
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('GD-Conductor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        session_id: 'unknown',
        timestamp_iso: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});