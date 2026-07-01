import { supabase } from "@/integrations/supabase/client";

export type DetectorKind = "silence" | "drift" | "escalation" | "consensus" | "abuse";

export interface DetectorDecision {
  kind: DetectorKind;
  rationale: string;
  action?: string;
  target_user?: string | null;
  score?: number;
}

/**
 * Ask the server to run the session detectors (silence / drift / escalation /
 * consensus / abuse). Any triggered decisions are persisted to
 * `moderator_decisions` and returned for the caller to react to (nudge speaker,
 * offer to conclude, cool-down warning, etc.).
 */
export async function runSessionDetectors(
  sessionId: string,
  mode: DetectorKind | "all" = "all",
): Promise<DetectorDecision[]> {
  try {
    const { data, error } = await supabase.functions.invoke("session-detectors", {
      body: { session_id: sessionId, mode },
    });
    if (error) {
      console.warn("[detectors] invoke failed", error.message);
      return [];
    }
    return (data?.decisions ?? []) as DetectorDecision[];
  } catch (e) {
    console.warn("[detectors] threw", e);
    return [];
  }
}
