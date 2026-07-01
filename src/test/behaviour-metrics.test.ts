import { describe, it, expect } from "vitest";
import {
  gini,
  dominanceScore,
  engagementScore,
  interruptionRate,
  overallHealth,
} from "@/lib/behaviour/metrics";

describe("behaviour metrics", () => {
  it("gini is 0 for equal shares and 1 for concentrated share", () => {
    expect(gini([1, 1, 1, 1])).toBeCloseTo(0, 5);
    expect(gini([0, 0, 0, 1])).toBeGreaterThan(0.7);
    expect(gini([])).toBe(0);
    expect(gini([0, 0, 0])).toBe(0);
  });

  it("dominance is 0 at fair share and > 0 when hogging", () => {
    expect(dominanceScore(25, 100, 4)).toBeCloseTo(0, 5);
    expect(dominanceScore(80, 100, 4)).toBeGreaterThan(0.6);
    expect(dominanceScore(0, 100, 4)).toBe(0);
    expect(dominanceScore(50, 0, 4)).toBe(0);
  });

  it("engagement rises with turns and talk time, falls with interruptions", () => {
    const low = engagementScore({ turnCount: 1, talkTimeMs: 5_000, sessionAgeMs: 600_000, interruptionCount: 0 });
    const high = engagementScore({ turnCount: 15, talkTimeMs: 120_000, sessionAgeMs: 600_000, interruptionCount: 0 });
    expect(high).toBeGreaterThan(low);
    const disrupted = engagementScore({ turnCount: 15, talkTimeMs: 120_000, sessionAgeMs: 600_000, interruptionCount: 20 });
    expect(disrupted).toBeLessThan(high);
  });

  it("interruption rate scales per minute", () => {
    expect(interruptionRate(6, 60_000)).toBe(6);
    expect(interruptionRate(0, 60_000)).toBe(0);
    expect(interruptionRate(1, 0)).toBe(0);
  });

  it("overall health is 0-100 and higher for healthy signals", () => {
    const bad = overallHealth({
      participationGini: 0.9,
      interruptionRate: 10,
      sentimentIndex: -0.9,
      topicFocus: 0.1,
      energy: 0.1,
    });
    const good = overallHealth({
      participationGini: 0.1,
      interruptionRate: 0.5,
      sentimentIndex: 0.6,
      topicFocus: 0.8,
      energy: 0.7,
    });
    expect(bad).toBeGreaterThanOrEqual(0);
    expect(good).toBeLessThanOrEqual(100);
    expect(good).toBeGreaterThan(bad + 30);
  });
});
