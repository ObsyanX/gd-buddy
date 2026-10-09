// Discussion-room test log. Buffers events and flushes them in batches to
// public.room_test_events. Never throws — logging must not break the room.
import { supabase } from "@/integrations/supabase/client";

export type RoomEventKind =
  | "room_open" | "room_close" | "mic_permission" | "soundcheck"
  | "vad_start" | "vad_release" | "autosend_start" | "autosend_cancel" | "autosend_fire"
  | "floor_request" | "floor_grant" | "floor_queue" | "floor_release" | "slot_warning" | "slot_expired"
  | "interjection" | "icebreaker" | "ai_reply" | "tts_play" | "stt_result"
  | "participant_join" | "participant_leave" | "drive_join";

interface Ctx { sessionId: string | null; isDrive: boolean; isGroup: boolean; }
const ctx: Ctx = { sessionId: null, isDrive: false, isGroup: false };
let buffer: { kind: string; ok: boolean; payload: Record<string, unknown>; session_id: string | null; is_drive: boolean; is_group: boolean; created_at: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const started = Date.now();

export function setRoomContext(next: Partial<Ctx>) { Object.assign(ctx, next); }

export function logRoomEvent(kind: RoomEventKind, ok = true, payload: Record<string, unknown> = {}) {
  try {
    if (!ctx.sessionId) return;
    buffer.push({
      kind, ok, payload: { ...payload, t_ms: Date.now() - started },
      session_id: ctx.sessionId, is_drive: ctx.isDrive, is_group: ctx.isGroup,
      created_at: new Date().toISOString(),
    });
    if (buffer.length >= 20) void flushRoomLog();
    else if (!timer) timer = setTimeout(() => void flushRoomLog(), 4000);
  } catch { /* ignore */ }
}

export async function flushRoomLog() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!buffer.length) return;
  const rows = buffer; buffer = [];
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    await supabase.from("room_test_events").insert(rows.map((r) => ({ ...r, user_id: uid, payload: r.payload as never })));
  } catch { /* drop silently */ }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { void flushRoomLog(); });
}
