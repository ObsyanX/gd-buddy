// fallacy-detector — heuristic pre-filter + AI classification of logical fallacies.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: 'ad_hominem', regex: /\byou('re| are)? (stupid|dumb|ignorant|clueless|biased)\b/i },
  { type: 'straw_man', regex: /\bso (you|you're) saying (that )?\b/i },
  { type: 'false_dichotomy', regex: /\beither .{2,40} or .{2,40}\b/i },
  { type: 'appeal_to_authority', regex: /\b(everyone|experts?) (say|know|agree)s?\b/i },
  { type: 'appeal_to_emotion', regex: /\bthink of the (children|kids|families)\b/i },
  { type: 'hasty_generalization', regex: /\ball (of )?(them|those|these) (people|guys|folks)\b/i },
  { type: 'slippery_slope', regex: /\b(if we (allow|permit)|next thing|before you know it)\b/i },
  { type: 'circular_reasoning', regex: /\bbecause (it is|it's) (true|right|correct)\b/i },
  { type: 'red_herring', regex: /\b(anyway|besides), what about\b/i },
  { type: 'whataboutism', regex: /\bwhat about\b.{0,60}\?/i },
];

function heuristicHints(text: string) {
  const hints: Array<{ type: string; snippet: string }> = [];
  const seen = new Set<string>();
  for (const { type, regex } of PATTERNS) {
    const m = text.match(regex);
    if (m && !seen.has(type)) {
      seen.add(type);
      hints.push({ type, snippet: m[0] });
    }
  }
  return hints;
}

async function classifyAI(text: string) {
  const body = {
    model: LOVABLE_API_KEY ? 'google/gemini-2.5-flash' : 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content:
        `Identify logical fallacies (if any) in this utterance. Reply STRICT JSON: {"fallacies":[{"type":"ad_hominem|straw_man|false_dichotomy|appeal_to_authority|appeal_to_emotion|hasty_generalization|slippery_slope|circular_reasoning|red_herring|whataboutism","confidence":0-1,"explanation":"..."}]}. Return {"fallacies":[]} when there are none.\n\nUtterance: """${text}"""`,
    }],
    temperature: 0,
    response_format: { type: 'json_object' },
  };
  const url = LOVABLE_API_KEY
    ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const key = LOVABLE_API_KEY ?? GROQ_API_KEY;
  if (!key) return { fallacies: [] };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { fallacies: [] };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{"fallacies":[]}';
    try { return JSON.parse(raw); } catch { return { fallacies: [] }; }
  } catch { return { fallacies: [] }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { session_id, message_id, content } = await req.json();
    if (!session_id || !content) {
      return new Response(JSON.stringify({ error: 'session_id, content required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: require valid JWT and that caller can access this session
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const jwt = authHeader.slice('Bearer '.length);
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: canAccess } = await supabase.rpc('can_access_session', { _session_id: session_id, _user_id: userId });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    const hints = heuristicHints(content);
    // Only spend AI tokens if there is a hint OR the utterance is >30 words (worth analyzing).
    const shouldAsk = hints.length > 0 || content.trim().split(/\s+/).length >= 30;
    const ai = shouldAsk ? await classifyAI(content) : { fallacies: [] };

    const rows = (ai.fallacies ?? [])
      .filter((f: any) => f && typeof f.type === 'string')
      .slice(0, 5)
      .map((f: any) => ({
        session_id,
        message_id: message_id ?? null,
        fallacy_type: String(f.type).slice(0, 40),
        confidence: Math.max(0, Math.min(1, Number(f.confidence) || 0)),
        explanation: f.explanation ? String(f.explanation).slice(0, 500) : null,
      }));

    if (rows.length) await supabase.from('fallacies').insert(rows);

    return new Response(JSON.stringify({ fallacies: rows, hints }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fallacy-detector error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
