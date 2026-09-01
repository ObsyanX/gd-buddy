// graph-builder — extracts arguments/evidence/counters from recent messages and writes nodes+edges.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireSessionAccess } from "../_shared/auth-guard.ts";
import { callAI } from "../_shared/ai-with-fallback.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function extract(transcript: string) {
  const prompt = `From this GD transcript, extract a small argumentation graph.
Reply STRICT JSON:
{"nodes":[{"label":"...","node_type":"concept|argument|evidence|counter|question","salience":0-1}],
 "edges":[{"from":"label","to":"label","relation":"supports|contradicts|elaborates|questions|cites","strength":0-1}]}

Transcript:
${transcript}`;

  try {
    const data = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const raw = data.choices?.[0]?.message?.content ?? '{"nodes":[],"edges":[]}';
    return JSON.parse(raw);
  } catch (e) {
    console.error('graph-builder AI failed', (e as Error).message);
    return { nodes: [], edges: [] };
  }
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
    const authOrResp = await requireSessionAccess(req, session_id);
    if (authOrResp instanceof Response) return authOrResp;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: msgs, error: msgErr } = await supabase
      .from('gd_messages')
      .select('text')
      .eq('session_id', session_id)
      .order('start_ts', { ascending: true })
      .limit(60);
    if (msgErr) console.error('graph-builder gd_messages error', msgErr);

    const transcript = (msgs ?? []).map((m: any, i: number) => `${i + 1}. ${m.text ?? ''}`).join('\n');
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

    const { data: inserted, error: nodeErr } = await supabase
      .from('knowledge_nodes')
      .insert(nodeRows)
      .select('id, label');
    if (nodeErr) console.error('graph-builder knowledge_nodes insert error', nodeErr);

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

    if (edgeRows.length) {
      const { error: edgeErr } = await supabase.from('knowledge_edges').insert(edgeRows);
      if (edgeErr) console.error('graph-builder knowledge_edges insert error', edgeErr);
    }

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
