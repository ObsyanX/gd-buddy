// Personal-key routing: per-user isolation, provider order, platform-fallback
// switch, and circuit-breaker pause/retest. Uses an in-memory fake of the
// backend tables and fake provider endpoints — no real keys or quotas.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

const ENV: Record<string, string> = {
  BYOK_ENCRYPTION_KEY: "y".repeat(64),
  SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
};

type Row = Record<string, any>;
let tables: Record<string, Row[]>;
let providerStatus: Record<string, number>;
let providerCalls: { host: string; key: string }[];

const HOSTS: Record<string, string> = {
  "api.groq.com": "groq",
  "api.openai.com": "openai",
  "api.mistral.ai": "mistral",
};

function applyFilters(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  params.forEach((v, k) => {
    if (["select", "order", "limit"].includes(k)) return;
    const [op, ...rest] = v.split(".");
    const val = rest.join(".");
    out = out.filter((r) => {
      if (op === "eq") return String(r[k]) === val;
      if (op === "is") return String(r[k]) === val;
      if (op === "gte") return String(r[k] ?? "") >= val;
      return true;
    });
  });
  return out;
}

async function fakeFetch(input: any, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  if (url.host === "db.test") {
    const table = url.pathname.replace("/rest/v1/", "");
    const rows = (tables[table] ??= []);
    const method = init?.method ?? "GET";
    if (method === "GET") return new Response(JSON.stringify(applyFilters(rows, url.searchParams)));
    if (method === "POST") {
      rows.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), dismissed: false, occurrences: 1, ...JSON.parse(String(init!.body)) });
      return new Response("", { status: 201 });
    }
    if (method === "PATCH") {
      for (const r of applyFilters(rows, url.searchParams)) Object.assign(r, JSON.parse(String(init!.body)));
      return new Response("", { status: 204 });
    }
  }
  const provider = HOSTS[url.host];
  if (provider) {
    const auth = (init?.headers as Record<string, string>)?.Authorization ?? "";
    providerCalls.push({ host: provider, key: auth.replace("Bearer ", "") });
    const status = providerStatus[provider] ?? 200;
    if (status !== 200) return new Response(JSON.stringify({ error: { message: "fail" } }), { status });
    return new Response(JSON.stringify({ choices: [{ message: { content: `hi from ${provider}` } }], usage: { prompt_tokens: 3, completion_tokens: 4 } }));
  }
  throw new Error("unexpected fetch " + url);
}

let enc: (s: string) => Promise<string>;
let router: typeof import("../../supabase/functions/_shared/ai/router");
let creds: typeof import("../../supabase/functions/_shared/ai/credentials");

beforeAll(async () => {
  (globalThis as any).Deno = { env: { get: (k: string) => ENV[k] } };
  enc = (await import("../../supabase/functions/_shared/ai/crypto")).encryptSecret;
  router = await import("../../supabase/functions/_shared/ai/router");
  creds = await import("../../supabase/functions/_shared/ai/credentials");
});

const realFetch = globalThis.fetch;
beforeEach(() => {
  tables = { user_provider_credentials: [], user_ai_preferences: [], ai_provider_events: [], ai_usage_events: [] };
  providerStatus = {};
  providerCalls = [];
  globalThis.fetch = vi.fn(fakeFetch) as any;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

async function addKey(user: string, provider: string, key: string, priority = 0, extra: Row = {}) {
  tables.user_provider_credentials.push({
    id: `${user}-${provider}`, user_id: user, provider, category: "text", model: null,
    priority, enabled: true, disabled_until: null, consecutive_failures: 0,
    encrypted_key: await enc(key), ...extra,
  });
}
const body = { messages: [{ role: "user", content: "hello" }] };

describe("per-user key isolation", () => {
  it("only ever uses the signed-in user's own keys", async () => {
    await addKey("alice", "groq", "gsk_alice_key_123456");
    await addKey("bob", "openai", "sk-bob-key-12345678");
    const r = await router.routeUserText("alice", body);
    expect(r.response?.provider).toBe("groq");
    expect(providerCalls).toEqual([{ host: "groq", key: "gsk_alice_key_123456" }]);
    expect(providerCalls.some((c) => c.key.includes("bob"))).toBe(false);
  });

  it("a user with no keys gets no personal attempt and platform fallback", async () => {
    await addKey("bob", "openai", "sk-bob-key-12345678");
    const r = await router.routeUserText("carol", body);
    expect(r).toEqual({ platformFallback: true, attempted: [] });
    expect(providerCalls).toHaveLength(0);
  });

  it("one user's exhausted quota never pauses another user's key", async () => {
    await addKey("alice", "groq", "gsk_alice_key_123456");
    await addKey("bob", "groq", "gsk_bob_key_1234567");
    providerStatus.groq = 402;
    await router.routeUserText("alice", body);
    const alice = tables.user_provider_credentials.find((r) => r.user_id === "alice")!;
    const bob = tables.user_provider_credentials.find((r) => r.user_id === "bob")!;
    expect(alice.disabled_until).not.toBeNull();
    expect(bob.disabled_until).toBeNull();
    expect(tables.ai_provider_events.every((e) => e.user_id === "alice")).toBe(true);
  });
});

describe("provider order and platform fallback switch", () => {
  it("tries the preferred provider first, then priority_order", async () => {
    await addKey("u", "groq", "gsk_1111111111111", 0);
    await addKey("u", "openai", "sk-2222222222222", 1);
    await addKey("u", "mistral", "ms-3333333333333", 2);
    tables.user_ai_preferences.push({ user_id: "u", preferred_text: "mistral", platform_fallback: true, priority_order: { text: ["openai", "groq"] } });
    providerStatus.mistral = 503;
    providerStatus.openai = 429;
    const r = await router.routeUserText("u", body);
    expect(r.attempted).toEqual(["mistral", "openai", "groq"]);
    expect(r.response?.provider).toBe("groq");
    expect(r.response?.json).toMatchObject({ choices: [{ message: { content: "hi from groq" } }] });
    expect(tables.ai_usage_events.filter((e) => e.outcome === "error")).toHaveLength(2);
  });

  it("with platform fallback off, reports the failure instead of switching", async () => {
    await addKey("u", "groq", "gsk_1111111111111");
    tables.user_ai_preferences.push({ user_id: "u", platform_fallback: false });
    providerStatus.groq = 401;
    const r = await router.routeUserText("u", body);
    expect(r.response).toBeUndefined();
    expect(r.platformFallback).toBe(false);
    expect(r.lastError?.kind).toBe("invalid_key");
    expect(tables.ai_provider_events[0]).toMatchObject({ provider: "groq", error_kind: "invalid_key" });
  });

  it("with platform fallback on, allows the built-in chain after all keys fail", async () => {
    await addKey("u", "groq", "gsk_1111111111111");
    providerStatus.groq = 500;
    const r = await router.routeUserText("u", body);
    expect(r.response).toBeUndefined();
    expect(r.platformFallback).toBe(true);
  });

  it("never routes around a safety refusal", async () => {
    await addKey("u", "groq", "gsk_1111111111111", 0);
    await addKey("u", "openai", "sk-2222222222222", 1);
    const errors = await import("../../supabase/functions/_shared/ai/errors");
    const spy = vi.spyOn(errors, "classifyStatus");
    providerStatus.groq = 400;
    const res = await router.routeUserText("u", body);
    // A plain 400 is not a refusal: the next key is tried.
    expect(res.attempted).toEqual(["groq", "openai"]);
    spy.mockRestore();
  });
});

describe("circuit breaker", () => {
  it("pauses after repeated failures, skips while paused, retests after expiry", async () => {
    await addKey("u", "groq", "gsk_1111111111111");
    providerStatus.groq = 503;
    await router.routeUserText("u", body);
    let row = tables.user_provider_credentials[0];
    expect(row.consecutive_failures).toBe(1);
    expect(row.disabled_until).toBeNull(); // single transient failure: no pause

    await router.routeUserText("u", body);
    row = tables.user_provider_credentials[0];
    expect(row.consecutive_failures).toBe(2);
    expect(new Date(row.disabled_until).getTime()).toBeGreaterThan(Date.now());
    // Repeated failures collapse into one notification.
    expect(tables.ai_provider_events).toHaveLength(1);
    expect(tables.ai_provider_events[0].occurrences).toBe(2);

    providerCalls = [];
    const paused = await router.routeUserText("u", body);
    expect(paused.attempted).toEqual([]);
    expect(providerCalls).toHaveLength(0);

    // Pause expires → half-open retest succeeds → breaker resets.
    row.disabled_until = new Date(Date.now() - 1000).toISOString();
    providerStatus.groq = 200;
    const ok = await router.routeUserText("u", body);
    expect(ok.response?.provider).toBe("groq");
    expect(row.consecutive_failures).toBe(0);
    expect(row.disabled_until).toBeNull();
    expect(row.validation_status).toBe("connected");
  });

  it("pauses account-blocked keys for 30 minutes on the first failure", async () => {
    await addKey("u", "groq", "gsk_1111111111111");
    providerStatus.groq = 402;
    await router.routeUserText("u", body);
    const until = new Date(tables.user_provider_credentials[0].disabled_until).getTime();
    expect(until - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(until - Date.now()).toBeLessThanOrEqual(30 * 60_000);
    expect(creds).toBeTruthy();
  });
});
