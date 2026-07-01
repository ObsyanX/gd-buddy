import { describe, it, expect } from "vitest";
import { computeBenchmark } from "@/lib/governance/benchmarking";

describe("benchmarking metrics", () => {
  it("computes perfect scores for identical labels", () => {
    const rows = Array.from({ length: 10 }, () => ({ predicted: "A", expected: "A", confidence: 1 }));
    const m = computeBenchmark(rows);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(1);
    expect(m.f1).toBe(1);
    expect(m.aiHumanAgreement).toBe(0); // one class → kappa denominator 0
    expect(m.calibrationEce).toBe(0);
  });

  it("counts FP and FN across classes", () => {
    const m = computeBenchmark([
      { predicted: "A", expected: "A" },
      { predicted: "A", expected: "B" }, // FP for A, FN for B
      { predicted: "B", expected: "B" },
      { predicted: "B", expected: "A" }, // FP for B, FN for A
    ]);
    expect(m.falsePositives).toBe(2);
    expect(m.falseNegatives).toBe(2);
    expect(m.n).toBe(4);
  });

  it("captures miscalibration in ECE", () => {
    // Model claims 90% confidence but is only 50% correct.
    const rows = [
      { predicted: "A", expected: "A", confidence: 0.9 },
      { predicted: "A", expected: "B", confidence: 0.9 },
    ];
    const m = computeBenchmark(rows);
    expect(m.calibrationEce).toBeGreaterThan(0.3);
  });

  it("returns positive kappa when predictions beat chance", () => {
    const rows = [
      ...Array.from({ length: 8 }, () => ({ predicted: "A", expected: "A" })),
      ...Array.from({ length: 8 }, () => ({ predicted: "B", expected: "B" })),
      { predicted: "A", expected: "B" },
      { predicted: "B", expected: "A" },
    ];
    const m = computeBenchmark(rows);
    expect(m.aiHumanAgreement).toBeGreaterThan(0.5);
  });
});
