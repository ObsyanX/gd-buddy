// Verifies the AI provider fallback chain: Lovable → Groq → (OpenRouter) → Mistral → Cerebras.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// No signed-in user in these tests: personal keys are skipped, platform chain runs.
vi.mock("../../supabase/functions/_shared/ai/request-user.ts", () => ({
  installRequestContext: () => {},
  currentUserId: async () => null,
  userIdFromAuth: async () => null,
}));

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
/** Hosts in call order, with repeated calls to the same host collapsed. */
function hostOrder(calls: Array<{ host: string }>) {
  return calls.map((c) => c.host).filter((h, i, a) => i === 0 || a[i - 1] !== h);
}
/** First model tried on each host. */
function firstModel(calls: Array<{ host: string; model?: string }>, host: string) {
  return calls.find((c) => c.host === host)?.model;
}

function mockFetch(failing: string[], status = 429, errBody = "upstream error") {
  const calls: Array<{ host: string; model?: string }> = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const host = new URL(url).host;
    const body = init?.body ? (JSON.parse(String(init.body)) as Body) : {};
    calls.push({ host, model: body.model });
    if (failing.some((f) => host.includes(f))) return new Response(errBody, { status });
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
    expect(calls.at(-1)?.model).toBe("openai/gpt-oss-120b");
  });

  it("falls back to Mistral when Lovable and Groq both fail", async () => {
    const calls = mockFetch(["ai.gateway.lovable.dev", "api.groq.com"]);
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("mistral");
    expect(hostOrder(calls)).toEqual([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
    ]);
    expect(calls.at(-1)?.model).toBe("mistral-medium-latest");
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
    expect(hostOrder(calls)).toEqual([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
      "api.cerebras.ai",
    ]);
    expect(calls.at(-1)?.model).toBe("gpt-oss-120b");
  });

  it("maps lightweight models to each provider's small tier", async () => {
    const calls = mockFetch([
      "ai.gateway.lovable.dev",
      "api.groq.com",
      "api.mistral.ai",
    ]);
    const { callAI } = await loadCallAI();
    await callAI({ ...REQUEST, model: "google/gemini-2.5-flash-lite" });
    expect(firstModel(calls, "api.groq.com")).toBe("openai/gpt-oss-20b");
    expect(firstModel(calls, "api.mistral.ai")).toBe("mistral-small-latest");
    expect(firstModel(calls, "api.cerebras.ai")).toBe("gpt-oss-120b");
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
    expect(seen.filter((h, i, a) => i === 0 || a[i - 1] !== h)).toHaveLength(4);
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
  it("tries the next Groq model when one model hits its per-minute limit", async () => {
    const calls: Array<{ host: string; model?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const host = new URL(String(input)).host;
        const body = JSON.parse(String(init?.body)) as Body;
        calls.push({ host, model: body.model });
        if (host === "ai.gateway.lovable.dev") return fail(402);
        if (body.model === "openai/gpt-oss-120b") {
          return new Response("Rate limit reached for model on tokens per minute (TPM). Please try again in 10.8s.", { status: 429 });
        }
        return ok(body.model ?? "");
      }),
    );
    const { callAI } = await loadCallAI();
    const res = await callAI(REQUEST);
    expect(res._provider).toBe("groq");
    expect(calls.filter((c) => c.host === "api.groq.com").map((c) => c.model)).toEqual([
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
    ]);
  });

  it("skips the main AI for later replies after it reports no credits", async () => {
    const calls = mockFetch(["ai.gateway.lovable.dev"], 402);
    const { callAI } = await loadCallAI();
    await callAI(REQUEST);
    await callAI(REQUEST);
    expect(calls.filter((c) => c.host === "ai.gateway.lovable.dev")).toHaveLength(1);
    expect(calls.at(-1)?.host).toBe("api.groq.com");
  });

  it("skips a rate-limited model on the next reply until its retry window passes", async () => {
    const calls: Array<{ host: string; model?: string }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const host = new URL(String(input)).host;
        const body = JSON.parse(String(init?.body)) as Body;
        calls.push({ host, model: body.model });
        if (host === "ai.gateway.lovable.dev") return fail(402);
        if (body.model === "openai/gpt-oss-120b") return new Response("try again in 30s", { status: 429 });
        return ok(body.model ?? "");
      }),
    );
    const { callAI } = await loadCallAI();
    await callAI(REQUEST);
    await callAI(REQUEST);
    expect(calls.filter((c) => c.model === "openai/gpt-oss-120b")).toHaveLength(1);
  });

  it("reads the retry wait from a 'try again in 10.8s' message", async () => {
    const { retryAfterMs } = await loadCallAI();
    expect(retryAfterMs("Please try again in 10.8s.", null, 30_000)).toBe(10_800);
    expect(retryAfterMs("busy", "5", 30_000)).toBe(5_000);
    expect(retryAfterMs("busy", null, 30_000)).toBe(30_000);
  });

  it("recognises OpenRouter's shared free daily cap", async () => {
    const { isOpenRouterDailyCap } = await loadCallAI();
    expect(isOpenRouterDailyCap("Rate limit exceeded: free-models-per-day. Add 10 credits")).toBe(true);
    expect(isOpenRouterDailyCap("google/gemma is temporarily rate-limited upstream")).toBe(false);
  });
});
