// Track 7: Session replay recorder. Buffers events client-side and flushes
// to `replay_events` in batches; upserts a `session_replays` header row.
import { supabase } from "@/integrations/supabase/client";

export type ReplayEventType =
  | "phase_change"
  | "turn_start"
  | "turn_end"
  | "message"
  | "moderation_action"
  | "silence"
  | "completion_signal"
  | "score_update"
  | "custom";

export interface ReplayEventInput {
  type: ReplayEventType;
  actor_id?: string | null;
  actor_kind?: "human" | "ai" | "system";
  payload?: Record<string, unknown>;
}

interface QueuedEvent extends ReplayEventInput {
  offset_ms: number;
}

export class ReplayRecorder {
  private sessionId: string;
  private ownerId: string;
  private replayId: string | null = null;
  private startedAt = Date.now();
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private eventCount = 0;

  constructor(sessionId: string, ownerId: string) {
    this.sessionId = sessionId;
    this.ownerId = ownerId;
  }

  async start(): Promise<void> {
    const { data, error } = await supabase
      .from("session_replays")
      .upsert(
        {
          session_id: this.sessionId,
          owner_id: this.ownerId,
          duration_seconds: 0,
          event_count: 0,
          summary: {},
        },
        { onConflict: "session_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    this.replayId = data.id as string;
    this.startedAt = Date.now();
    this.flushTimer = setInterval(() => void this.flush(), 5000);
  }

  record(evt: ReplayEventInput): void {
    if (!this.replayId) return;
    this.queue.push({ ...evt, offset_ms: Date.now() - this.startedAt });
    this.eventCount++;
    if (this.queue.length >= 25) void this.flush();
  }

  async flush(): Promise<void> {
    if (!this.replayId || this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    const rows = batch.map((e) => ({
      replay_id: this.replayId!,
      offset_ms: e.offset_ms,
      event_type: e.type,
      actor_id: e.actor_id ?? null,
      actor_kind: e.actor_kind ?? "human",
      payload: (e.payload ?? {}) as never,
    }));
    const { error } = await supabase.from("replay_events").insert(rows);
    if (error) {
      // Requeue on failure so we don't lose events.
      this.queue.unshift(...batch);
      return;
    }
    await supabase
      .from("session_replays")
      .update({
        duration_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
        event_count: this.eventCount,
      })
      .eq("id", this.replayId);
  }

  async stop(summary: Record<string, unknown> = {}): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (this.replayId) {
      await supabase
        .from("session_replays")
        .update({
          duration_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
          event_count: this.eventCount,
          summary,
        })
        .eq("id", this.replayId);
    }
  }
}
