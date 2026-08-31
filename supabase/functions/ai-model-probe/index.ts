// Temporary diagnostic: lists model ids available on each fallback provider.
Deno.serve(async () => {
  const out: Record<string, unknown> = {};
  const probes: Array<[string, string, string | undefined]> = [
    ["groq", "https://api.groq.com/openai/v1/models", Deno.env.get("GROQ_API_KEY")],
    ["mistral", "https://api.mistral.ai/v1/models", Deno.env.get("MISTRALAI_API_KEY")],
    ["cerebras", "https://api.cerebras.ai/v1/models", Deno.env.get("CEREBRAS_API_KEY")],
  ];
  for (const [name, url, key] of probes) {
    if (!key) { out[name] = "no key"; continue; }
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json();
      out[name] = { status: r.status, ids: (j.data ?? []).map((m: {id:string}) => m.id) };
    } catch (e) { out[name] = String(e); }
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
