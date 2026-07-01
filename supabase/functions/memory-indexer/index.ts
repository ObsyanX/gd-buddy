// memory-indexer — embed a new utterance, store it, and flag duplicates.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const DUPLICATE_THRESHOLD = 0.86;

async function embed(text: string): Promise<number[] | null> {
  // Prefer Lovable AI Gateway
  if (LOVABLE_API_KEY) {
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      });
      if (res.ok) {
        const data = await res.json();
        const vec = data.data?.[0]?.embedding;
        if (Array.isArray(vec)) return truncateOrPad(vec, 384);
      }
    } catch (_) { /* fall through */ }
  }
  // Deterministic fallback so pipeline never breaks (hash-based bag-of-words 384-dim)
  return hashEmbedding(text, 384);
}

function truncateOrPad(v: number[], dim: number): number[] {
  if (v.length === dim) return v;
  if (v.length > dim) return v.slice(0, dim);
  return [...v, ...new Array(dim - v.length).fill(0)];
}

function hashEmbedding(text: string, dim: number): number[] {
  const out = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dim;
    out[idx] += 1;
  }
  // L2 normalize
  const n = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / n);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { session_id, message_id, participant_id, user_id, content } = await req.json();
    if (!session_id || !message_id || !content) {
      return new Response(JSON.stringify({ error: 'session_id, message_id, content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const vec = await embed(content);
    if (!vec) {
      return new Response(JSON.stringify({ error: 'embed_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch prior memory for the session (bounded)
    const { data: history } = await supabase
      .from('conversation_memory')
      .select('message_id, content, embedding, user_id')
      .eq('session_id', session_id)
      .order('ts', { ascending: false })
      .limit(80);

    // Cheap semantic duplicate scan
    let dup: { orig: string; sim: number } | null = null;
    for (const row of history ?? []) {
      const emb = Array.isArray(row.embedding)
        ? (row.embedding as unknown as number[])
        : typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : null;
      if (!emb) continue;
      const sim = cosine(vec, emb);
      if (!dup || sim > dup.sim) dup = { orig: row.message_id, sim };
    }

    await supabase.from('conversation_memory').insert({
      session_id,
      message_id,
      participant_id: participant_id ?? null,
      user_id: user_id ?? null,
      content,
      embedding: vec as unknown as string, // pgvector accepts JSON-encoded array
      salience: 0.5,
    });

    let duplicate: unknown = null;
    if (dup && dup.sim >= DUPLICATE_THRESHOLD) {
      const { data } = await supabase
        .from('duplicate_ideas')
        .insert({
          session_id,
          original_message_id: dup.orig,
          duplicate_message_id: message_id,
          similarity: Number(dup.sim.toFixed(3)),
        })
        .select()
        .maybeSingle();
      duplicate = data;
    }

    return new Response(JSON.stringify({ ok: true, duplicate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('memory-indexer error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
