import { describe, expect, it } from "vitest";
import { bucketize } from "@/lib/observability/latency-monitor";

describe("Track 8: latency-monitor bucketize", () => {
  it("returns empty array on empty input", () => {
    expect(bucketize([])).toEqual([]);
  });

  it("computes percentiles per operation name", () => {
    const rows = [
      ...Array.from({ length: 100 }, (_, i) => ({ name: "op-a", duration_ms: i + 1, ok: true })),
      { name: "op-b", duration_ms: 5, ok: false },
      { name: "op-b", duration_ms: 10, ok: true },
    ];
    const out = bucketize(rows);
    const a = out.find((b) => b.name === "op-a")!;
    const b = out.find((b) => b.name === "op-b")!;
    expect(a.count).toBe(100);
    expect(a.p50_ms).toBeGreaterThanOrEqual(50);
    expect(a.p95_ms).toBeGreaterThanOrEqual(95);
    expect(a.error_rate).toBe(0);
    expect(b.count).toBe(2);
    expect(b.error_rate).toBe(0.5);
  });

  it("sorts by count descending", () => {
    const rows = [
      { name: "small", duration_ms: 1, ok: true },
      { name: "big", duration_ms: 1, ok: true },
      { name: "big", duration_ms: 2, ok: true },
      { name: "big", duration_ms: 3, ok: true },
    ];
    const out = bucketize(rows);
    expect(out[0].name).toBe("big");
    expect(out[1].name).toBe("small");
  });
});
