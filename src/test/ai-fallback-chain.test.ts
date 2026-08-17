// Verifies the AI provider fallback chain: Lovable → Groq → Mistral → Cerebras.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV: Record<string, string> = {
  LOVABLE_API_KEY: "test-lovable",
  GROQ_API_KEY: "test-groq",
  MISTRALAI_API_KEY: "test-mistral",
  CEREBRAS_API_KEY: "test-cerebras",
  // no SUPABASE_URL / SERVICE_ROLE_KEY → usage + error logging become no-ops
};

// Minimal Deno shim so the edge-function module can run under vitest.
(globalThis as unknown as { Deno: unknown }).Deno = {
  env: { get: (k: string) => ENV[k] },
};

type Body = { model?: string };

function ok(model: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: "hi" } }], model }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function fail(status: number) {
  return new Response("upstream error", { status });
}

/**
 * Installs a fetch mock that fails for every host in `failing` and succeeds
 * for the first host that isn't. Records the ordered list of hosts called.
 */
function mockFetch(failing: string[], status = 429) {
  const calls: Array<{ host: string; model?: string }> = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const host = new URL(url).host;
    const body = init?.body ? (JSON.parse(String(init.body)) as Body) : {};
    calls.push({ host, model: body.model });
    if (failing.some((f) => host.includes(f))) return fail(status);
    return ok(body.model ?? "");
  });
  vi.stubGlobal("fetch", spy);
  return calls;
}

async function loadCallAI() {
  vi.resetModules();
  const mod = await import("../../supabase/functions/_shared/ai-with-fallback.ts");
  return mod;
}

const REQUEST = {
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "ping" }],
};

describe("callAI provider fallback chain", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses Lovable AI when it succeeds", async () => {
    const calls = mockFetch([]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("lovable");
    expect(calls.map((c) => c.host)).toEqual(["ai.gateway.lovable.dev"]);
  });

  it("falls back to Groq when Lovable fails", async () => {
    const calls = mockFetch(["ai.gateway.lovable.dev"]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("groq");
    expect(calls.at(-1)?.host).toBe("api.groq.com");
    expect(calls.at(-1)?.model).toBe("llama-3.3-70b-versatile");
  });

  it("falls back to Mistral when Lovable and Groq both fail", async () => {
    const calls = mockFetch(["ai.gateway.lovable.dev", "api.groq.com"]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("mistral");
    expect(calls.map((c) => c.host)).toEqual([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
    ]);
    expect(calls.at(-1)?.model).toBe("mistral-large-latest");
  });

  it("falls back to Cerebras when Lovable, Groq and Mistral fail", async () => {
    const calls = mockFetch([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
    ]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("cerebras");
    expect(calls.map((c) => c.host)).toEqual([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
      "api.cerebras.ai",
    ]);
    expect(calls.at(-1)?.model).toBe("llama-3.3-70b");
  });

  it("maps lightweight models to each provider's small tier", async () => {
    const calls = mockFetch([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
    ]);
    const { callAI } = await loadCallAI();
    await callAI({ ...REQUEST, model: "google/gemini-2.5-flash-lite" });
    expect(calls[1].model).toBe("llama-3.1-8b-instant");
    expect(calls[2].model).toBe("mistral-small-latest");
    expect(calls[3].model).toBe("llama3.1-8b");
  });

  it("recovers when a provider throws a network error", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const host = new URL(String(input)).host;
        seen.push(host);
        if (host !== "api.cerebras.ai") throw new Error("network down");
        const body = JSON.parse(String(init?.body)) as Body;
        return ok(body.model ?? "");
      }),
    );
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("cerebras");
    expect(seen).toHaveLength(4);
  });

  it("throws AIProviderError('both') when every provider fails", async () => {
    mockFetch([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
      "api.cerebras.ai",
    ]);
    const { callAI, AIProviderError } = await loadCallAI();
    await expect(callAI(REQUEST)).rejects.toBeInstanceOf(AIProviderError);
    try {
      await callAI(REQUEST);
    } catch (e) {
      const err = e as InstanceType<typeof AIProviderError>;
      expect(err.provider).toBe("both");
      expect(err.message).toContain("All AI providers failed");
    }
  });

  it("skips providers whose API key is not configured", async () => {
    const saved = ENV.MISTRALAI_API_KEY;
    delete ENV.MISTRALAI_API_KEY;
    const calls = mockFetch(["ai.gateway.lovable.dev", "api.groq.com"]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    ENV.MISTRALAI_API_KEY = saved;
    expect(res._provider).toBe("cerebras");
    expect(calls.map((c) => c.host)).not.toContain("api.mistral.ai");
  });

  it("does not fall back on a non-retryable Lovable 4xx", async () => {
    const calls = mockFetch(["ai.gateway.lovable.dev"], 400);
    const { callAI, AIProviderError } = await loadCallAI();
    await expect(callAI(REQUEST)).rejects.toBeInstanceOf(AIProviderError);
    expect(calls.map((c) => c.host)).toEqual(["ai.gateway.lovable.dev"]);
  });
});
