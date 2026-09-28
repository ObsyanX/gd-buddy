// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  (globalThis as any).Deno = { env: { get: (k: string) => (k === "BYOK_ENCRYPTION_KEY" ? "x".repeat(64) : undefined) } };
});

describe("BYOK encryption", () => {
  it("round-trips and never contains plaintext", async () => {
    const { encryptSecret, decryptSecret } = await import("../../supabase/functions/_shared/ai/crypto");
    const key = "gsk_abcdefghijklmnopqrstuvwxyz123456";
    const enc = await encryptSecret(key);
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toContain(key);
    expect(await decryptSecret(enc)).toBe(key);
    expect(await encryptSecret(key)).not.toBe(enc); // random IV
  });
  it("rejects tampered payloads", async () => {
    const { encryptSecret, decryptSecret } = await import("../../supabase/functions/_shared/ai/crypto");
    const enc = await encryptSecret("sk-secret-value-123456");
    const [v, iv, ct] = enc.split(".");
    const bad = `${v}.${iv}.${ct.slice(0, -4)}AAAA`;
    await expect(decryptSecret(bad)).rejects.toBeTruthy();
    await expect(decryptSecret("garbage")).rejects.toThrow(/Malformed/);
  });
  it("masks and redacts keys", async () => {
    const { maskTail, redact } = await import("../../supabase/functions/_shared/ai/crypto");
    expect(maskTail("sk-1234567890abcd")).toBe("abcd");
    expect(maskTail("abc")).toBe("****");
    const out = redact("failed with key sk-proj_ABCDEFGHIJKLMNOP and token " + "a".repeat(40));
    expect(out).not.toContain("ABCDEFGHIJKLMNOP");
    expect(out).not.toContain("a".repeat(40));
  });
});

describe("BYOK error classification", () => {
  it("maps statuses to kinds and retry policy", async () => {
    const { classifyStatus, classifyThrown, isAccountBlocked } = await import("../../supabase/functions/_shared/ai/errors");
    const cases: Array<[number, string, string, boolean]> = [
      [401, "unauthorized", "invalid_key", false],
      [402, "", "quota_exhausted", false],
      [401, "quota_exceeded: You have 0 credits remaining", "invalid_key", false],
      [429, "slow down", "rate_limited", true],
      [429, "insufficient_quota", "quota_exhausted", false],
      [403, "forbidden", "permission", false],
      [404, "model_not_found", "unsupported_model", false],
      [400, "invalid audio file", "bad_audio", false],
      [400, "blocked by content policy", "safety_refusal", false],
      [503, "overloaded", "server_error", true],
      [400, "bad field", "bad_request", false],
    ];
    for (const [s, b, kind, retry] of cases) {
      const r = classifyStatus(s, b);
      expect(r.kind, `${s} ${b}`).toBe(kind);
      expect(r.retryable).toBe(retry);
    }
    expect(classifyStatus(429, "x", new Headers({ "retry-after": "7" })).retryAfter).toBe(7);
    expect(classifyThrown(new Error("request timed out")).kind).toBe("timeout");
    expect(classifyThrown(new Error("fetch failed")).kind).toBe("network");
    expect(isAccountBlocked("quota_exhausted")).toBe(true);
    expect(isAccountBlocked("rate_limited")).toBe(false);
  });
});
