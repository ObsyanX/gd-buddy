// graph-builder — extracts arguments/evidence/counters from recent messages and writes nodes+edges.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

async function extract(transcript: string) {
  const prompt = `From this GD transcript, extract a small argumentation graph.
Reply STRICT JSON:
{"nodes":[{"label":"...","node_type":"concept|argument|evidence|counter|question","salience":0-1}],
 "edges":[{"from":"label","to":"label","relation":"supports|contradicts|elaborates|questions|cites","strength":0-1}]}

Transcript:
${transcript}`;

  const body = {
    model: LOVABLE_API_KEY ? 'google/gemini-2.5-flash' : 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  };
  const url = LOVABLE_API_KEY
    ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const key = LOVABLE_API_KEY ?? GROQ_API_KEY;
  if (!key) return { nodes: [], edges: [] };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { nodes: [], edges: [] };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{"nodes":[],"edges":[]}';
    return JSON.parse(raw);
  } catch { return { nodes: [], edges: [] }; }
}

const VALID_TYPES = new Set(['concept','argument','evidence','counter','question']);
const VALID_RELS = new Set(['supports','contradicts','elaborates','questions','cites']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: msgs } = await supabase
      .from('gd_messages')
      .select('content')
      .eq('session_id', session_id)
      .order('end_ts', { ascending: true })
      .limit(60);

    const transcript = (msgs ?? []).map((m: any, i: number) => `${i + 1}. ${m.content ?? ''}`).join('\n');
    if (!transcript.trim()) {
      return new Response(JSON.stringify({ ok: true, nodes: 0, edges: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const graph = await extract(transcript);

    const nodeRows = (graph.nodes ?? [])
      .filter((n: any) => n && typeof n.label === 'string' && VALID_TYPES.has(n.node_type))
      .slice(0, 40)
      .map((n: any) => ({
        session_id,
        node_type: n.node_type,
        label: String(n.label).slice(0, 160),
        salience: Math.max(0, Math.min(1, Number(n.salience) || 0.5)),
      }));

    if (!nodeRows.length) {
      return new Response(JSON.stringify({ ok: true, nodes: 0, edges: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: inserted } = await supabase
      .from('knowledge_nodes')
      .insert(nodeRows)
      .select('id, label');

    const idByLabel = new Map<string, string>();
    for (const n of inserted ?? []) idByLabel.set(n.label.trim().toLowerCase(), n.id);

    const edgeRows = (graph.edges ?? [])
      .filter((e: any) => e && VALID_RELS.has(e.relation))
      .map((e: any) => ({
        session_id,
        from_node: idByLabel.get(String(e.from ?? '').trim().toLowerCase()),
        to_node: idByLabel.get(String(e.to ?? '').trim().toLowerCase()),
        relation: e.relation,
        strength: Math.max(0, Math.min(1, Number(e.strength) || 0.5)),
      }))
      .filter((e: any) => e.from_node && e.to_node && e.from_node !== e.to_node)
      .slice(0, 80);

    if (edgeRows.length) await supabase.from('knowledge_edges').insert(edgeRows);

    return new Response(
      JSON.stringify({ ok: true, nodes: nodeRows.length, edges: edgeRows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('graph-builder error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
