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
  _provider?: "lovable" | "groq";
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

      if (!isFallbackable) {
        throw new AIProviderError("lovable", response.status, lovableErrorText);
      }
    } catch (e) {
      if (e instanceof AIProviderError) throw e;
      lovableThrew = true;
      lovableErrorText = e instanceof Error ? e.message : String(e);
      console.warn(`[ai-fallback] Lovable AI threw: ${lovableErrorText}`);
    }
  } else {
    console.warn("[ai-fallback] LOVABLE_API_KEY missing — going straight to Groq");
  }

  // --- 2. Fallback to Groq ---
  if (!GROQ_API_KEY) {
    throw new AIProviderError(
      "lovable",
      lovableStatus || 500,
      `Lovable AI failed and GROQ_API_KEY is not configured. ${lovableErrorText}`,
    );
  }

  console.log(
    `[ai-fallback] Falling back to Groq (lovable_status=${lovableStatus}, threw=${lovableThrew})`,
  );

  try {
    const response = await callGroq(body, GROQ_API_KEY);
    if (response.ok) {
      const json = await response.json();
      json._provider = "groq";
      return json as AIResponse;
    }
    const groqErrorText = await response.text();
    console.error(
      `[ai-fallback] Groq fallback failed ${response.status}: ${groqErrorText.slice(0, 200)}`,
    );
    throw new AIProviderError("both", response.status, groqErrorText);
  } catch (e) {
    if (e instanceof AIProviderError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ai-fallback] Groq fallback threw: ${msg}`);
    throw new AIProviderError("both", 500, msg);
  }
}
