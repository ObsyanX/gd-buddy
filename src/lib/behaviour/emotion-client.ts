// Track 3 — Client helpers to trigger behaviour aggregation and emotion inference.

import { supabase } from "@/integrations/supabase/client";
import type { ProsodyFeatures } from "@/lib/behaviour/prosody-features";

let lastAggregateAt = 0;
const AGGREGATE_MIN_INTERVAL_MS = 8_000;

export async function triggerBehaviourAggregation(sessionId: string): Promise<void> {
  const now = Date.now();
  if (now - lastAggregateAt < AGGREGATE_MIN_INTERVAL_MS) return;
  lastAggregateAt = now;
  try {
    await supabase.functions.invoke("behaviour-aggregator", { body: { session_id: sessionId } });
  } catch (err) {
    console.error("[behaviour-aggregator] invoke failed", err);
  }
}

const emotionDebounce = new Map<string, number>();

export async function submitEmotionSignal(input: {
  sessionId: string;
  participantId: string | null;
  text?: string | null;
  prosody?: ProsodyFeatures | null;
  consentText: boolean;
}): Promise<void> {
  const key = `${input.sessionId}:${input.participantId ?? "anon"}`;
  const now = Date.now();
  const last = emotionDebounce.get(key) ?? 0;
  if (now - last < 4_000) return;
  emotionDebounce.set(key, now);

  try {
    await supabase.functions.invoke("emotion-analyzer", {
      body: {
        session_id: input.sessionId,
        participant_id: input.participantId,
        text: input.consentText ? input.text ?? null : null,
        prosody: input.prosody
          ? {
              pitch_hz: input.prosody.pitchHz,
              pitch_var_hz: input.prosody.pitchVarHz,
              energy_rms: input.prosody.energyRms,
              zero_crossing_rate: input.prosody.zeroCrossingRate,
              voiced: input.prosody.voiced,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("[emotion-analyzer] invoke failed", err);
  }
}
