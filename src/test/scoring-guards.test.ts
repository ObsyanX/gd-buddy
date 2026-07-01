import { describe, it, expect } from "vitest";
import { assessTurn, idempotencyKey } from "@/lib/scoring-guards";

describe("assessTurn", () => {
  const base = { duration_ms: 4000 };

  it("flags too-short turns", () => {
    const r = assessTurn({ ...base, participant_id: "a", text: "yes." }, []);
    expect(r.flags).toContain("too_short");
    expect(r.penalty).toBeGreaterThan(0);
  });

  it("detects echoing another speaker", () => {
    const prior = [
      { participant_id: "b", text: "Remote work improves productivity and lowers commute stress significantly", duration_ms: 5000 },
    ];
    const r = assessTurn(
      { ...base, participant_id: "a", text: "Remote work improves productivity and lowers commute stress significantly" },
      prior,
    );
    expect(r.flags).toContain("echoed_prior_speaker");
    expect(r.duplicate_of).toBe("b");
  });

  it("detects self-repetition", () => {
    const prior = [
      { participant_id: "a", text: "Automation will reshape entry-level roles across every industry rapidly", duration_ms: 5000 },
    ];
    const r = assessTurn(
      { ...base, participant_id: "a", text: "Automation will reshape entry-level roles across every industry rapidly" },
      prior,
    );
    expect(r.flags).toContain("self_repetition");
  });

  it("flags unrealistic pace", () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const r = assessTurn({ participant_id: "a", text, duration_ms: 1000 }, []);
    expect(r.flags).toContain("unrealistic_pace");
  });

  it("passes a normal contribution", () => {
    const r = assessTurn(
      { participant_id: "a", text: "One angle no one raised: rural bandwidth still gates remote hiring in tier-3 towns.", duration_ms: 6000 },
      [{ participant_id: "b", text: "I agree remote work is great for cities", duration_ms: 4000 }],
    );
    expect(r.penalty).toBeLessThan(0.2);
  });
});

describe("idempotencyKey", () => {
  it("collides within the same bucket", () => {
    const a = idempotencyKey({ session_id: "s", action: "score", now: 1000, bucketMs: 2000 });
    const b = idempotencyKey({ session_id: "s", action: "score", now: 1500, bucketMs: 2000 });
    expect(a).toBe(b);
  });
  it("differs across buckets", () => {
    const a = idempotencyKey({ session_id: "s", action: "score", now: 1000, bucketMs: 2000 });
    const b = idempotencyKey({ session_id: "s", action: "score", now: 3500, bucketMs: 2000 });
    expect(a).not.toBe(b);
  });
});
