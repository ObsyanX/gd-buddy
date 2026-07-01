// Track 2 + Track 9 — Client orchestrator.
// Reasoning → Policy → Calibration → Safety → Dispatcher, with `event_log`
// telemetry at each step. Safe to call from polling loops (fire-and-forget).
import { supabase } from "@/integrations/supabase/client";
import type { SessionState } from "@/lib/policy-engine";
import { calibrate, shouldAutoAct } from "@/lib/governance/calibration";
import { logEvent } from "@/lib/governance/event-log";

interface Signal {
  kind: string;
  [k: string]: unknown;
}

interface Candidate {
  action: string;
  confidence: number;
  target_user_id?: string;
  reasoning: string;
  evidence: Record<string, unknown>;
  alternatives: Array<{ action: string; reasoning: string }>;
}

interface AppliedDecision {
  id: string;
  action: string;
  matched_rule: string;
  calibrated_confidence: number;
  auto_acted: boolean;
  safety: { kind: string; verdict: string };
}

async function callSafety(session_id: string, text: string) {
  try {
    const { data } = await supabase.functions.invoke("safety-validator", {
      body: { session_id, function_name: "intelligence-pipeline", text },
    });
    return (data as { verdict: string; kind: string } | null) ?? { verdict: "allowed", kind: "other" };
  } catch {
    return { verdict: "allowed", kind: "other" };
  }
}

export async function runIntelligencePipeline(
  session_id: string,
  state: SessionState,
  signals: Signal[],
) {
  const { data: r } = await supabase.functions.invoke("reasoning-agent", {
    body: { session_id, state, signals },
  });
  const interventions = (r as { interventions?: Candidate[] })?.interventions ?? [];

  const applied: AppliedDecision[] = [];

  for (const candidate of interventions) {
    // 1) Calibrate raw confidence against rolling empirical accuracy.
    const calibrated = await calibrate(candidate.action, candidate.confidence ?? 0);
    const autoAct = shouldAutoAct(calibrated);
    const calibratedCandidate: Candidate = { ...candidate, confidence: calibrated };

    // 2) Deterministic policy evaluation.
    const { data: p } = await supabase.functions.invoke("policy-engine", {
      body: { session_id, state, candidate: calibratedCandidate },
    });
    const decision = (p as {
      allowed?: boolean;
      decision?: { action: string; matched_rule: string; confidence: number };
    })?.decision;
    if (!decision) continue;

    // 3) Safety validator on the visible text (reasoning is what participants see).
    const safety = await callSafety(session_id, candidate.reasoning ?? candidate.action);
    if (safety.verdict === "blocked") {
      await logEvent({
        sessionId: session_id,
        kind: "safety.blocked",
        payload: { action: decision.action, kind: safety.kind },
      });
      continue;
    }

    await logEvent({
      sessionId: session_id,
      kind: "policy.triggered",
      payload: {
        action: decision.action,
        matched_rule: decision.matched_rule,
        raw_confidence: candidate.confidence,
        calibrated_confidence: calibrated,
        auto_acted: autoAct,
        safety_verdict: safety.verdict,
      },
    });

    // 4) Dispatch. If calibrated confidence is below auto-act threshold, the
    //    dispatcher receives a `recommendation` flag so the UI can require
    //    manual acknowledgement before the action goes live.
    const { data: d } = await supabase.functions.invoke("action-dispatcher", {
      body: {
        session_id,
        decision,
        candidate: calibratedCandidate,
        mode: autoAct ? "auto" : "recommendation",
        safety,
      },
    });
    const id = (d as { id?: string })?.id;
    if (id) {
      applied.push({
        id,
        action: decision.action,
        matched_rule: decision.matched_rule,
        calibrated_confidence: calibrated,
        auto_acted: autoAct,
        safety,
      });
    }
  }
  return { applied };
}
