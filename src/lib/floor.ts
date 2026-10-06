// Fair floor for AI members: they queue through request_mic like humans.
import { supabase } from "@/integrations/supabase/client";
import { logRoomEvent } from "@/lib/room-log";

export const TURN_SLOT_SECONDS = 45;
/** ~2.3 spoken words per second; leave headroom so a reply fits its slot. */
export const SLOT_WORD_BUDGET = Math.floor(TURN_SLOT_SECONDS * 2.3);

/** Trim text at a sentence boundary so it can be spoken inside one slot. */
export function fitToSlot(text: string, maxWords = SLOT_WORD_BUDGET): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  const cut = words.slice(0, maxWords).join(" ");
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > cut.length * 0.5 ? cut.slice(0, end + 1) : cut.replace(/[,;:]?$/, "…");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask for the floor on behalf of an AI participant and wait until granted.
 * Humans who requested the mic are served first. Gives up after `maxWaitMs`.
 */
export async function acquireAiFloor(sessionId: string, participantId: string, opts: { maxWaitMs?: number; isCancelled?: () => boolean } = {}): Promise<boolean> {
  const deadline = Date.now() + (opts.maxWaitMs ?? 60_000);
  let firstQueued = true;
  while (Date.now() < deadline) {
    if (opts.isCancelled?.()) return false;
    const { data, error } = await supabase.rpc("request_mic" as never, {
      _session_id: sessionId, _kind: "ai", _source: "ai_pick", _participant_id: participantId, _slot_seconds: TURN_SLOT_SECONDS,
    } as never);
    if (error) { logRoomEvent("floor_request", false, { kind: "ai", message: error.message }); return true; } // never block the room on a queue error
    const res = data as { status: string; position?: number };
    if (res?.status === "granted") { logRoomEvent("floor_grant", true, { kind: "ai" }); return true; }
    if (res?.status === "queued" && firstQueued) { logRoomEvent("floor_queue", true, { kind: "ai", position: res.position }); firstQueued = false; }
    await sleep(1500);
  }
  logRoomEvent("floor_queue", false, { kind: "ai", reason: "timeout" });
  // Withdraw the pending request so it doesn't block others.
  await releaseAiFloor(sessionId, participantId);
  return false;
}

export async function releaseAiFloor(sessionId: string, participantId: string) {
  try {
    const { error } = await supabase.rpc("release_mic" as never, { _session_id: sessionId, _participant_id: participantId } as never);
    logRoomEvent("floor_release", !error, { kind: "ai" });
  } catch { /* ignore */ }
}
