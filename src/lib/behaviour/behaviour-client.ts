// Track 3 — Realtime hooks for behaviour + health.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiscussionHealthRow {
  session_id: string;
  participation_gini: number;
  interruption_rate: number;
  sentiment_index: number;
  topic_focus: number;
  energy: number;
  overall_health: number;
  updated_at: string;
}

export interface ParticipantBehaviourRow {
  id: string;
  session_id: string;
  participant_id: string;
  talk_time_ms: number;
  turn_count: number;
  interruption_count: number;
  avg_turn_ms: number;
  dominance_score: number;
  engagement_score: number;
  sentiment_avg: number;
  sentiment_trend: number;
  emotion_label: string | null;
  last_spoke_at: string | null;
  updated_at: string;
}

export function useDiscussionHealth(sessionId: string | null) {
  const [health, setHealth] = useState<DiscussionHealthRow | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setHealth(null);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("discussion_health")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (!cancelled && data) setHealth(data as DiscussionHealthRow);
    })();

    const channel = supabase
      .channel(`discussion_health:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_health", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as DiscussionHealthRow | null;
          if (row && !cancelled) setHealth(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return health;
}

export function useParticipantBehaviour(sessionId: string | null) {
  const [rows, setRows] = useState<ParticipantBehaviourRow[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setRows([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("participant_behaviour")
        .select("*")
        .eq("session_id", sessionId);
      if (!cancelled && data) setRows(data as ParticipantBehaviourRow[]);
    })();

    const channel = supabase
      .channel(`participant_behaviour:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participant_behaviour", filter: `session_id=eq.${sessionId}` },
        () => {
          if (cancelled) return;
          supabase
            .from("participant_behaviour")
            .select("*")
            .eq("session_id", sessionId)
            .then(({ data }) => {
              if (!cancelled && data) setRows(data as ParticipantBehaviourRow[]);
            });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return rows;
}
