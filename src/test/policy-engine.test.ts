import { describe, it, expect } from "vitest";
import { evaluatePolicies, type PolicyRule } from "@/lib/policy-engine";

const rules: PolicyRule[] = [
  { rule_id: "queue_wait", priority: 10, when_expr: { queue_size: { ">": 0 } }, then_action: { action: "wait" }, confidence_floor: 0.9, enabled: true },
  { rule_id: "silence_engage", priority: 20, when_expr: { silence_ms: { ">": 30000 } }, then_action: { action: "engage_prompt" }, confidence_floor: 0.7, enabled: true },
  { rule_id: "dominance", priority: 40, when_expr: { top_dominance_pct: { ">": 45 } }, then_action: { action: "invite_quiet" }, confidence_floor: 0.7, enabled: true },
  { rule_id: "low_conf_suggest", priority: 60, when_expr: { ai_confidence: { "<": 0.5 } }, then_action: { action: "suggest_only" }, confidence_floor: 0.5, enabled: true },
  { rule_id: "wrap_up", priority: 70, when_expr: { all_spoken: true, completion_score: { ">": 0.8 } }, then_action: { action: "recommend_conclusion" }, confidence_floor: 0.8, enabled: true },
];

describe("evaluatePolicies", () => {
  it("returns the highest-priority (lowest number) matching rule", () => {
    const d = evaluatePolicies(rules, { queue_size: 2, silence_ms: 40000 }, 0.95);
    expect(d?.matched_rule).toBe("queue_wait");
  });

  it("skips rules whose confidence floor is not met", () => {
    const d = evaluatePolicies(rules, { silence_ms: 45000 }, 0.6);
    expect(d?.matched_rule).toBe("silence_engage");
    const d2 = evaluatePolicies(rules, { silence_ms: 45000 }, 0.65);
    expect(d2?.matched_rule).toBe("silence_engage"); // floor 0.7 not met → skipped
    expect(evaluatePolicies(rules, { silence_ms: 45000 }, 0.5)?.matched_rule).not.toBe("silence_engage");
  });

  it("requires all keys in when_expr to match (AND)", () => {
    expect(evaluatePolicies(rules, { all_spoken: true, completion_score: 0.5 }, 0.9)).toBeNull();
    expect(evaluatePolicies(rules, { all_spoken: true, completion_score: 0.85 }, 0.9)?.matched_rule).toBe("wrap_up");
  });

  it("returns null when nothing matches", () => {
    expect(evaluatePolicies(rules, { queue_size: 0 }, 0.9)).toBeNull();
  });

  it("respects enabled flag", () => {
    const off = rules.map((r) => (r.rule_id === "queue_wait" ? { ...r, enabled: false } : r));
    const d = evaluatePolicies(off, { queue_size: 3, silence_ms: 40000 }, 0.95);
    expect(d?.matched_rule).toBe("silence_engage");
  });
});
