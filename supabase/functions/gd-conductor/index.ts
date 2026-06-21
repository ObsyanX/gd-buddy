import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content moderation: blocked patterns and safety checks
const BLOCKED_PATTERNS = [
  /\b(hate\s+speech|kill\s+all|death\s+to)\b/i,
  /\b(racial\s+slur|ethnic\s+cleansing)\b/i,
  /\b(bomb\s+threat|shoot\s+up|mass\s+murder)\b/i,
];

const SENSITIVE_TOPICS_WARNING = [
  /\b(suicide|self[- ]harm|eating\s+disorder)\b/i,
  /\b(terrorism|extremism|radicali[sz]ation)\b/i,
];

function moderateContent(text: string): { blocked: boolean; warning: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, warning: false, reason: 'Content violates safety guidelines' };
    }
  }
  for (const pattern of SENSITIVE_TOPICS_WARNING) {
    if (pattern.test(text)) {
      return { blocked: false, warning: true, reason: 'Sensitive topic detected' };
    }
  }
  return { blocked: false, warning: false };
}

// Input validation schema
const inputSchema = z.object({
  session_id: z.string().uuid().optional(),
  topic: z.string().max(500).optional(),
  topic_meta: z.object({
    category: z.string().max(100).optional(),
    difficulty: z.string().max(50).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }).optional(),
  participants: z.array(z.any()).max(20, 'Too many participants').optional(),
  conversation_history: z.array(z.any()).max(100, 'Too many conversation turns').optional(),
  latest_user_utterance: z.string().max(2000).optional(),
  metrics_so_far: z.any().optional(),
  benchmarks: z.any().optional(),
  config: z.any().optional(),
  request: z.enum(['generate_responses', 'invigilator_update', 'post_session_report', 'topic_suggestions']).optional(),
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

    const body = parseResult.data;
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

    // Content moderation on user input
    if (latest_user_utterance) {
      const modResult = moderateContent(latest_user_utterance);
      if (modResult.blocked) {
        console.warn(`[Moderation] Blocked input in session ${session_id}: ${modResult.reason}`);
        return new Response(
          JSON.stringify({
            session_id,
            timestamp_iso: new Date().toISOString(),
            request_handled: request_type,
            participant_responses: [],
            invigilator_signals: {
              live_hint: "Your message was flagged for inappropriate content. Please rephrase and try again."
            },
            moderation: { blocked: true, reason: modResult.reason },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (modResult.warning) {
        console.warn(`[Moderation] Sensitive topic in session ${session_id}: ${modResult.reason}`);
      }
    }

    console.log(`GD-Conductor: Processing ${request_type} for session ${session_id}`);

    const moderatorMode = config.moderator_mode || false;
    const citationMode = config.citation_mode || false;

    // Build the system prompt
    const systemPrompt = `You are GD-Conductor — an AI that orchestrates realistic Group Discussion practice sessions. You control multiple AI participants with distinct personas.

Your job: Accept session state + user input → decide what each AI participant says (or remains silent) → mark interruptions/overlaps → produce concise, persona-consistent replies → provide invigilator feedback → output structured JSON with TTS metadata.

CRITICAL: Output ONLY valid JSON. No prose, no markdown, no explanations.

CONTENT SAFETY: Never generate responses containing hate speech, slurs, threats, or explicit content. Keep all AI participant responses professional and appropriate for an educational discussion context. If a user's input touches sensitive topics, the AI participants should respond thoughtfully and redirect toward constructive discussion.

═══════════════════════════════════════════════════════
ORIGINALITY ENGINE — THE MOST IMPORTANT RULES
═══════════════════════════════════════════════════════
An AI participant in a real Group Discussion does NOT echo, paraphrase, or politely restate what the previous speaker just said. They add something the room did not have a second ago. Your single most important job is to make every AI reply genuinely additive.

BEFORE generating each AI reply, silently do this:
1. Identify the EXACT claim the user (or last speaker) just made.
2. List the angles already covered in conversation_history (data, ethics, law, design, ops, economics, tech, lived experience, history, policy, risk, opportunity, etc.).
3. Pick an UNCOVERED angle that fits this persona's lens.
4. Form a NEW claim — a counterpoint, a contradiction, a fresh example, a hidden trade-off, a question that exposes a blind spot, a piece of evidence, a reframing, or a "yes-but" with a real new dimension.
5. Write the reply STARTING from that new claim, not from agreement.

HARD BANS (a reply that does any of these is invalid — regenerate it):
- Paraphrasing the user's last statement.
- "I agree", "exactly", "great point", "that's true", "absolutely" as the substance of a reply.
- Restating the topic.
- Generic hedging ("it depends", "both sides have merit") without a concrete new claim.
- Two AI replies in the same turn that make the same point or use the same angle.
- Quoting back the user's keywords as if they were the AI's own insight.

INTENT DISTRIBUTION (enforce across the session, not just one turn):
- ~40%  contradict / counterpoint  (push back with a different view)
- ~30%  elaborate-with-new-evidence / example  (add a stat, study, case, or concrete instance the user did NOT mention)
- ~20%  ask_question  (a sharp question that exposes a missing dimension — NOT a soft "what do you think?")
- ~10%  agree-with-addition  (only if the reply contributes a clearly new sub-point)
Pure "agree" with no addition is FORBIDDEN.

PERSONA LENS LOCK — every AI must argue from its own role's lens:
- Data Analyst / Researcher / Financial Analyst / Economist → cite a number, trend, study, ratio, or macro indicator (invent plausible figures if needed, framed as "studies suggest", "industry data shows", "roughly X%").
- Legal Counsel / Policy Advisor → raise a specific risk, regulation, precedent, compliance gap, or governance angle.
- Software Engineer / Cybersecurity Expert → surface a technical constraint, implementation reality, attack surface, or feasibility limit.
- Designer / Strategy Consultant → propose a reframing, a user-experience angle, or a long-horizon implication others missed.
- HR Manager / Psychologist / Team Lead → surface a human/behavioral consequence, motivation, or culture effect.
- Business Lead / Startup Founder / Operations Manager → push on outcomes, speed, ROI, execution feasibility, opportunity cost.
- Social Activist / Sustainability Expert / Media Expert → bring an ethical, environmental, equity, or public-perception angle.
- Student Representative → bring a ground-level / lived / campus / first-job example.
Every reply must be RECOGNIZABLE as coming from that persona's lens. If a Data Analyst doesn't cite a number, the reply is wrong.

ANGLE DIVERSITY WITHIN A TURN:
If you generate 2 AI replies in one turn, they must use DIFFERENT intents AND DIFFERENT lenses. Never two "agree" in a row. Never two of the same role's angle.

LANGUAGE FRESHNESS:
Avoid vocabulary and sentence openers already used in recent conversation_history. Vary opening verbs ("Actually,", "But consider —", "The data tells a different story:", "One thing nobody's said yet:", "From a compliance angle,", "On the ground, though,", etc.). Never start with "I think that" two replies in a row.

═══════════════════════════════════════════════════════

${moderatorMode ? `MODERATOR MODE ENABLED:
You also control a "Moderator" who manages the discussion. The moderator should:
- Open discussions with context-setting (on first turn when conversation is empty)
- Enforce fair speaking time — if one participant dominates, redirect to others
- Redirect stalled or off-topic conversations
- Call for summaries when discussion is winding down
- Encourage quieter participants to share their views
- Use the "moderator_action" field: "open", "redirect", "time_warning", "summarize_request", "encourage"
The moderator participant_id should be "moderator". The moderator speaks in a professional, neutral facilitation style.
Include moderator responses in participant_responses with participant_id: "moderator".` : ''}

OUTPUT SCHEMA:
{
  "session_id": "string",
  "timestamp_iso": "ISO date",
  "request_handled": "generate_responses|invigilator_update|post_session_report|topic_suggestions",
  "participant_responses": [
    {
      "participant_id": "string",
      "text": "max ${config.max_reply_words || 55} words — must contain a NEW claim, not a restatement",
      "intent": "contradict|counterpoint|elaborate|example|ask_question|agree-with-addition|clarify|summarize",
      "lens": "data|legal|technical|design|human|business|ethical|ground-level|policy|economic|other",
      "novelty_note": "<=10 words describing the new angle this reply introduces",
      "interruption": boolean,
      "overlap_seconds": number,
      "clip_strategy": "mix|fade_previous|cut_previous",
      "follow_up": "short suggestion",
      "tts_ssml": "<speak><voice name='...'><prosody rate='...' pitch='...'>text</prosody></voice></speak>",
      "voice": {"voice_name": "...", "rate_pct": 100, "pitch_pct": 0, "style": "..."},
      "confidence_estimate": number${moderatorMode ? ',\n      "moderator_action": "open|redirect|time_warning|summarize_request|encourage"' : ''}
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
1. Keep replies under ${config.max_reply_words || 55} words, 1-3 sentences, but always contain a NEW claim.
2. User participants (is_user=true) are NEVER generated.
3. Choose at most 2 AI participants to respond${moderatorMode ? ' (plus moderator if needed)' : ''}.
4. Match persona tone/verbosity/vocab — but never at the cost of originality.
5. Mark interruptions based on persona.interrupt_level and config.interruption_mode.
6. Generate valid SSML for TTS.
7. Provide helpful invigilator feedback for the user.
8. Be interview-realistic: real GD participants COMPETE for airtime by adding value, not by agreeing.
9. If a draft reply would violate the HARD BANS, rewrite it before emitting.`;

    // Build conversation context
    const conversationContext = conversation_history.map((turn: any) => 
      `${turn.who}: ${turn.text}`
    ).join('\n');

    // Build metrics context for post-session report
    const metricsContext = request_type === 'post_session_report' && metrics_so_far ? `
ACTUAL PERFORMANCE METRICS (calculated from real session data):
- Words Per Minute: ${metrics_so_far.words_per_min || 0}
- Total Words Spoken: ${metrics_so_far.total_words || 0}
- Filler Word Count: ${metrics_so_far.filler_count || 0}
- Filler Rate: ${((metrics_so_far.fillerRate || 0) * 100).toFixed(1)}%
- Session Duration: ${(metrics_so_far.sessionDurationMinutes || 0).toFixed(1)} minutes
- User Contributions: ${metrics_so_far.userMessageCount || 0} messages
- Total Messages: ${metrics_so_far.totalMessageCount || 0}
- Participation Rate: ${((metrics_so_far.participationRate || 0) * 100).toFixed(0)}%
- Avg Words/Response: ${metrics_so_far.avgResponseLength || 0}
- Avg Response Time: ${(metrics_so_far.avgResponseTime || 0).toFixed(1)}s
- Vocabulary Diversity: ${metrics_so_far.uniqueWords || 0} unique words
- Calculated Scores: Fluency=${metrics_so_far.fluency_score || 0}, Content=${metrics_so_far.content_score || 0}, Structure=${metrics_so_far.structure_score || 0}, Voice=${metrics_so_far.voice_score || 0}

BENCHMARKS:
- Ideal WPM: 120-180 (target: 150)
- Filler Rate Target: <3%
- Ideal Words/Response: 40-100 (target: 60)
- Participation Target: 15-35%` : '';

    const benchmarksInfo = body.benchmarks ? `
INDUSTRY BENCHMARKS PROVIDED:
${JSON.stringify(body.benchmarks, null, 2)}` : '';

    // Derive a "must-bring" instruction from each persona's role so the LLM
    // anchors every reply to that participant's lens (no generic agreement).
    const mustBringFor = (role: string = ''): string => {
      const r = role.toLowerCase();
      if (/(data|research|analyst|economist|financial)/.test(r)) return 'a number, stat, study, ratio, or trend';
      if (/(legal|policy|counsel|compliance|advisor)/.test(r)) return 'a specific risk, regulation, precedent, or governance gap';
      if (/(engineer|developer|software|cyber|security|tech)/.test(r)) return 'a technical constraint, feasibility limit, or attack surface';
      if (/(design|strategy|consultant|creative)/.test(r)) return 'a reframing, UX angle, or long-horizon implication';
      if (/(hr|psycholog|team lead|coach|people)/.test(r)) return 'a human, behavioral, motivational, or culture consequence';
      if (/(business|founder|startup|operations|product|manager)/.test(r)) return 'an ROI, speed, execution, or opportunity-cost angle';
      if (/(activist|sustain|environment|esg|media|public)/.test(r)) return 'an ethical, equity, environmental, or public-perception angle';
      if (/(student|youth|rep)/.test(r)) return 'a ground-level, lived, campus, or first-job example';
      return 'a fresh angle the room has NOT yet covered';
    };

    const userMessage = `Topic: ${topic}
Category: ${topic_meta.category || 'General'}
Difficulty: ${topic_meta.difficulty || 'Medium'}

Participants:
${participants.map((p: any) => {
  if (p.is_user) {
    return `- ${p.id} (USER): ${p.persona?.name || 'Participant'} — do NOT generate a reply for this participant.`;
  }
  const persona = p.persona || {};
  const role = persona.role || 'Discussant';
  const must = mustBringFor(role);
  return `- ${p.id} (AI): ${persona.name || 'Participant'} | Role: ${role} | Tone: ${persona.tone || 'neutral'} | Verbosity: ${persona.verbosity || 'moderate'} | Vocab: ${persona.vocab_level || 'intermediate'} | Agreeability: ${persona.agreeability ?? 0} | Interrupt: ${persona.interrupt_level ?? 0.2}
  LENS LOCK → every reply from ${persona.name || p.id} MUST bring ${must}. If the draft reply does not, rewrite it.`;
}).join('\n')}

Recent conversation (most recent last):
${conversationContext || 'No previous turns — this is the opening of the discussion.'}

Latest user utterance: "${latest_user_utterance}"
${metricsContext}
${benchmarksInfo}

Request: ${request_type}

${request_type === 'generate_responses' ? `Generate AI participant responses now.

REMINDER — apply the ORIGINALITY ENGINE strictly:
1. Do NOT paraphrase or agree-only with the user's last point.
2. Each chosen AI must speak from its LENS LOCK above.
3. If 2 AIs reply, they must use DIFFERENT intents AND DIFFERENT lenses.
4. Bias toward contradict / counterpoint / new-evidence / sharp-question intents.
5. Fill the "novelty_note" field for each reply — if you cannot state a new angle in <=10 words, the reply is invalid; rewrite it.
6. Vary opening phrases; do not reuse openers already in the recent conversation.` : ''}
${request_type === 'invigilator_update' ? 'Provide invigilator feedback based on metrics.' : ''}
${request_type === 'post_session_report' ? `Generate a detailed post-session analysis using the ACTUAL METRICS provided above. 
Your response MUST include:
1. "strengths": Array of 3-5 specific strengths based on the real metrics (e.g., if WPM is in ideal range, mention that)
2. "weaknesses": Array of 2-4 specific areas needing improvement based on the real metrics
3. "drills": Array of 2-3 improvement exercises, each with "title" and "description"
4. "overall_feedback": A 2-3 sentence summary referencing the actual performance numbers

IMPORTANT: Reference the ACTUAL numbers from the metrics. Do NOT make up statistics. Use the real data provided.` : ''}`;

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
        temperature: 0.95,
        top_p: 0.95,
        frequency_penalty: 0.6,
        presence_penalty: 0.6,
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
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      parsedResponse = JSON.parse(jsonMatch[1]);
    } catch (e) {
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

    // Post-moderation + originality filter on AI-generated responses
    if (parsedResponse.participant_responses && request_type === 'generate_responses') {
      const userUtter = (latest_user_utterance || '').toLowerCase().trim();
      const userTokens = new Set(
        userUtter.split(/\W+/).filter(w => w.length > 4)
      );

      const isEcho = (text: string): boolean => {
        const t = (text || '').toLowerCase().trim();
        if (!t) return true;
        // Pure agreement openers with no substance
        if (/^(i\s+(totally\s+)?agree|exactly|absolutely|great point|that'?s (true|right)|well said|i second that)[\s.,!]*$/i.test(t)) return true;
        // Heavy token overlap with the user's utterance (>=70% of user's content words echoed in a short reply)
        if (userTokens.size >= 3) {
          const replyTokens = new Set(t.split(/\W+/));
          let overlap = 0;
          userTokens.forEach(tok => { if (replyTokens.has(tok)) overlap++; });
          const ratio = overlap / userTokens.size;
          if (ratio >= 0.7 && t.length < userUtter.length * 1.4) return true;
        }
        return false;
      };

      parsedResponse.participant_responses = parsedResponse.participant_responses.filter((r: any) => {
        const check = moderateContent(r.text || '');
        if (check.blocked) {
          console.warn(`[Moderation] Filtered AI response from ${r.participant_id}: ${check.reason}`);
          return false;
        }
        if (isEcho(r.text || '')) {
          console.warn(`[Originality] Dropped echo reply from ${r.participant_id}: "${r.text}"`);
          return false;
        }
        // Require novelty_note to be present and non-trivial
        const note = (r.novelty_note || '').trim();
        if (!note || note.length < 3) {
          console.warn(`[Originality] Dropped reply from ${r.participant_id} — missing novelty_note`);
          return false;
        }
        return true;
      });
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
