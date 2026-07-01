// Track 2 — Pure policy evaluator. No I/O. Consumes a SessionState snapshot
// and a list of moderation_policies rows; returns the first rule whose
// `when_expr` matches, ordered by `priority` ascending (lower = evaluated
// first) and `confidence` >= rule floor.
//
// Rule format (data, not code):
//   {
//     rule_id: string,
//     priority: number,
//     when_expr: { <state_key>: <predicate> },  // AND across keys
//     then_action: { action: string, params?: object },
//     confidence_floor: number,
//     enabled: boolean,
//   }
//
// Predicate forms:
//   - primitive equality: 5, true, "phase"
//   - comparator object: { ">": 30000 }, { "<": 0.5 }, { ">=": 3 }, { "<=": 0.8 }, { "!=": "ended" }
//
// This engine intentionally does not reason. It validates. The Reasoning
// Agent must produce a candidate `Intervention` first with its own confidence;
// the engine only decides whether the policy allows it.

export type Predicate =
  | number
  | string
  | boolean
  | { ">"?: number; "<"?: number; ">="?: number; "<="?: number; "!="?: unknown; "=="?: unknown };

export interface PolicyRule {
  rule_id: string;
  priority: number;
  when_expr: Record<string, Predicate>;
  then_action: { action: string; params?: Record<string, unknown> };
  confidence_floor: number;
  enabled: boolean;
}

export interface SessionState {
  queue_size?: number;
  silence_ms?: number;
  interruptions?: number;
  top_dominance_pct?: number;
  drift_score?: number;
  ai_confidence?: number;
  all_spoken?: boolean;
  completion_score?: number;
  quality_score?: number;
  phase?: string;
  [k: string]: unknown;
}

export interface PolicyDecision {
  action: string;
  params?: Record<string, unknown>;
  matched_rule: string;
  confidence: number;
}

function matches(value: unknown, pred: Predicate): boolean {
  if (pred === null || pred === undefined) return false;
  if (typeof pred !== "object") return value === pred;
  const p = pred as Record<string, unknown>;
  if ("==" in p) return value === p["=="];
  if ("!=" in p) return value !== p["!="];
  if (typeof value !== "number") return false;
  if (">" in p && !(value > (p[">"] as number))) return false;
  if ("<" in p && !(value < (p["<"] as number))) return false;
  if (">=" in p && !(value >= (p[">="] as number))) return false;
  if ("<=" in p && !(value <= (p["<="] as number))) return false;
  return true;
}

export function evaluatePolicies(
  rules: PolicyRule[],
  state: SessionState,
  candidateConfidence: number,
): PolicyDecision | null {
  const active = rules
    .filter((r) => r.enabled !== false)
    .sort((a, b) => a.priority - b.priority);

  for (const r of active) {
    if (candidateConfidence < r.confidence_floor) continue;
    const allMatch = Object.entries(r.when_expr).every(([k, pred]) =>
      matches(state[k], pred),
    );
    if (allMatch) {
      return {
        action: r.then_action.action,
        params: r.then_action.params,
        matched_rule: r.rule_id,
        confidence: candidateConfidence,
      };
    }
  }
  return null;
}
