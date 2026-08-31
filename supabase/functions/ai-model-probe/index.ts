// Temporary diagnostic: tests candidate models on each fallback provider.
const CASES: Array<[string, string, string, string[]]> = [
  ["groq", "https://api.groq.com/openai/v1/chat/completions", "GROQ_API_KEY", [
    "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b",
  ]],
  ["mistral", "https://api.mistral.ai/v1/chat/completions", "MISTRALAI_API_KEY", [
    "mistral-small-latest", "ministral-8b-latest", "mistral-medium-latest", "mistral-large-latest",
  ]],
  ["cerebras", "https://api.cerebras.ai/v1/chat/completions", "CEREBRAS_API_KEY", [
    "gpt-oss-120b", "gemma-4-31b",
  ]],
];

Deno.serve(async (req) => {
  const json = new URL(req.url).searchParams.get("json") === "1";
  const out: Record<string, unknown> = {};
  for (const [name, url, envKey, models] of CASES) {
    const key = Deno.env.get(envKey);
    if (!key) { out[name] = "no key"; continue; }
    const results: Record<string, string> = {};
    for (const model of models) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: 'Reply with JSON {"ok":true}' }],
            max_tokens: 50,
            ...(json ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        results[model] = r.ok ? "OK" : `${r.status}: ${(await r.text()).slice(0, 160)}`;
      } catch (e) { results[model] = `threw: ${String(e).slice(0, 120)}`; }
    }
    out[name] = results;
  }
  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
