// Shared AI client with automatic Groq fallback when Lovable AI fails.
//
// Usage:
//   import { callAI } from "../_shared/ai-with-fallback.ts";
//   const aiResponse = await callAI({
//     model: 'google/gemini-2.5-flash',
//     messages: [...],
//     temperature: 0.7,
//     // optional: tools, tool_choice, response_format, top_p, frequency_penalty,
//     // presence_penalty, max_tokens, max_completion_tokens
//   });
//   const content = aiResponse.choices?.[0]?.message?.content;
//
// Behavior:
//   1. Calls Lovable AI Gateway with LOVABLE_API_KEY.
//   2. On 429 / 402 / 5xx / network error, automatically retries against Groq
//      using GROQ_API_KEY with an equivalent model.
//   3. Returns the OpenAI-format JSON response so existing parsing logic works.
//   4. Throws if both providers fail.

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";

// Map Lovable/Gemini model names → Groq-supported model names.
function mapToGroqModel(model: string): string {
  const m = (model || "").toLowerCase();
  // Lightweight / fast tier
  if (m.includes("flash-lite") || m.includes("nano") || m.includes("mini")) {
    return "llama-3.1-8b-instant";
  }
  // Default / balanced / pro tier → strongest commonly available Groq model
  return "llama-3.3-70b-versatile";
}

// Map model names → Mistral-supported model names.
function mapToMistralModel(model: string): string {
  const m = (model || "").toLowerCase();
  if (m.includes("flash-lite") || m.includes("nano") || m.includes("mini")) {
    return "mistral-small-latest";
  }
  return "mistral-large-latest";
}

// Map model names → Cerebras-supported model names.
function mapToCerebrasModel(model: string): string {
  const m = (model || "").toLowerCase();
  if (m.includes("flash-lite") || m.includes("nano") || m.includes("mini")) {
    return "llama3.1-8b";
  }
  return "llama-3.3-70b";
}


export interface AIRequestBody {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
}

export interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  _provider?: "lovable" | "groq";
}

// Best-effort name of the edge function that issued the call, inferred from the
// stack so existing call sites need no changes.
function inferFunctionName(): string {
  const stack = new Error().stack ?? "";
  const m = stack.match(/functions\/([a-z0-9-_]+)\/[a-z0-9-_.]+\.ts/i);
  return m?.[1] ?? "unknown";
}

// Rough per-million-token pricing used only for dashboard estimates.
function estimateCostUsd(model: string, inTok: number, outTok: number): number {
  const m = (model || "").toLowerCase();
  const rate = m.includes("pro") ? { i: 1.25, o: 5 } : { i: 0.1, o: 0.4 };
  return (inTok / 1e6) * rate.i + (outTok / 1e6) * rate.o;
}

async function recordUsage(
  json: AIResponse,
  model: string,
  provider: "lovable" | "groq",
  functionName: string,
) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const inTok = json.usage?.prompt_tokens ?? 0;
    const outTok = json.usage?.completion_tokens ?? 0;
    const cost = estimateCostUsd(model, inTok, outTok);
    const headers = {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    };

    await Promise.all([
      fetch(`${url}/rest/v1/ai_costs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          function_name: functionName,
          model_id: model,
          input_tokens: inTok,
          output_tokens: outTok,
          cost_estimate: cost,
          metadata: { provider },
        }),
      }),
      fetch(`${url}/rest/v1/token_usage`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          function_name: functionName,
          model,
          input_tokens: inTok,
          output_tokens: outTok,
          cached: false,
          cost_estimate: cost,
        }),
      }),
    ]);
  } catch (e) {
    console.warn("[ai-fallback] usage logging failed:", (e as Error).message);
  }
}

/**
 * Record a provider-specific AI failure into public.error_logs so the admin
 * "AI & error monitor" can differentiate Lovable AI vs Groq vs total failure.
 */
export async function recordAiError(input: {
  provider: "lovable" | "groq" | "both";
  status: number;
  message: string;
  model?: string;
  functionName: string;
  fallbackUsed?: boolean;
  sessionId?: string | null;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/error_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        error_message: `[${input.provider}] ${input.message}`.slice(0, 2000),
        error_source: `ai_${input.provider}`,
        error_stack: null,
        page_url: null,
        metadata: {
          provider: input.provider,
          status: input.status,
          model: input.model ?? null,
          function_name: input.functionName,
          fallback_used: input.fallbackUsed ?? false,
          session_id: input.sessionId ?? null,
          severity: input.provider === "both" ? "critical" : "high",
        },
      }),
    });
  } catch (e) {
    console.warn("[ai-fallback] error logging failed:", (e as Error).message);
  }
}





// Errors that the caller may want to handle distinctly even after fallback fails.
export class AIProviderError extends Error {
  status: number;
  provider: "lovable" | "groq" | "both";
  body: string;
  constructor(provider: "lovable" | "groq" | "both", status: number, body: string) {
    super(`AI provider error (${provider}, status ${status}): ${body.slice(0, 300)}`);
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}

async function callLovable(body: AIRequestBody, apiKey: string): Promise<Response> {
  return await fetch(LOVABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function callGroq(body: AIRequestBody, apiKey: string): Promise<Response> {
  const groqBody: AIRequestBody = {
    ...body,
    model: mapToGroqModel(body.model || ""),
  };
  return await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(groqBody),
  });
}

/**
 * Call Lovable AI with automatic Groq fallback.
 * Returns the parsed OpenAI-format response. Adds `_provider` for logging.
 */
export async function callAI(body: AIRequestBody): Promise<AIResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  const fnName = inferFunctionName();

  let lovableStatus = 0;
  let lovableErrorText = "";
  let lovableThrew = false;

  // --- 1. Try Lovable AI ---
  if (LOVABLE_API_KEY) {
    try {
      const response = await callLovable(body, LOVABLE_API_KEY);
      lovableStatus = response.status;

      if (response.ok) {
        const json = await response.json();
        json._provider = "lovable";
        await recordUsage(json as AIResponse, body.model ?? "", "lovable", fnName);
        return json as AIResponse;
      }


      lovableErrorText = await response.text();
      console.warn(
        `[ai-fallback] Lovable AI returned ${response.status}: ${lovableErrorText.slice(0, 200)}`,
      );

      // For 4xx errors other than 402/429, surface the error — fallback won't help.
      const isFallbackable =
        response.status === 429 ||
        response.status === 402 ||
        response.status >= 500;

      await recordAiError({
        provider: "lovable",
        status: response.status,
        message: lovableErrorText || `HTTP ${response.status}`,
        model: body.model,
        functionName: fnName,
        fallbackUsed: isFallbackable,
      });

      if (!isFallbackable) {
        throw new AIProviderError("lovable", response.status, lovableErrorText);
      }
    } catch (e) {
      if (e instanceof AIProviderError) throw e;
      lovableThrew = true;
      lovableErrorText = e instanceof Error ? e.message : String(e);
      console.warn(`[ai-fallback] Lovable AI threw: ${lovableErrorText}`);
      await recordAiError({
        provider: "lovable",
        status: 0,
        message: lovableErrorText,
        model: body.model,
        functionName: fnName,
        fallbackUsed: true,
      });
    }

  } else {
    console.warn("[ai-fallback] LOVABLE_API_KEY missing — going straight to Groq");
  }

  // --- 2. Fallback chain: Groq → Mistral → Cerebras ---
  const chain: Array<{
    name: Provider;
    key?: string;
    url: string;
    map: (m: string) => string;
  }> = [
    { name: "groq", key: GROQ_API_KEY, url: GROQ_URL, map: mapToGroqModel },
    { name: "mistral", key: MISTRAL_API_KEY, url: MISTRAL_URL, map: mapToMistralModel },
    { name: "cerebras", key: CEREBRAS_API_KEY, url: CEREBRAS_URL, map: mapToCerebrasModel },
  ];

  const failures: string[] = [`lovable(${lovableThrew ? "threw" : lovableStatus || "n/a"})`];
  let lastStatus = lovableStatus || 500;

  for (const provider of chain) {
    if (!provider.key) {
      console.warn(`[ai-fallback] ${provider.name.toUpperCase()}_API_KEY missing — skipping`);
      failures.push(`${provider.name}(no key)`);
      continue;
    }

    const mappedModel = provider.map(body.model ?? "");
    console.log(`[ai-fallback] Trying ${provider.name} with model ${mappedModel}`);

    try {
      const response = await callProvider(provider.url, provider.key, body, mappedModel);
      if (response.ok) {
        const json = await response.json();
        json._provider = provider.name;
        await recordUsage(json as AIResponse, mappedModel, provider.name, fnName);
        return json as AIResponse;
      }
      const errText = await response.text();
      lastStatus = response.status;
      failures.push(`${provider.name}(${response.status})`);
      console.error(
        `[ai-fallback] ${provider.name} failed ${response.status}: ${errText.slice(0, 200)}`,
      );
      await recordAiError({
        provider: provider.name,
        status: response.status,
        message: errText || `HTTP ${response.status}`,
        model: mappedModel,
        functionName: fnName,
        fallbackUsed: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${provider.name}(threw)`);
      console.error(`[ai-fallback] ${provider.name} threw: ${msg}`);
      await recordAiError({
        provider: provider.name,
        status: 0,
        message: msg,
        model: mappedModel,
        functionName: fnName,
        fallbackUsed: true,
      });
    }
  }

  // --- 3. Every provider failed ---
  const summary = `All AI providers failed: ${failures.join(" + ")}. ${lovableErrorText.slice(0, 300)}`;
  await recordAiError({
    provider: "both",
    status: lastStatus,
    message: summary,
    model: body.model,
    functionName: fnName,
  });
  throw new AIProviderError("both", lastStatus, summary);
}

