// Slice 5: Transcription attribution & overlap handling
//
// The STT layer produces raw transcript segments. This helper attributes each
// segment to a speaker using:
//   1. Explicit floor holder (session.mic_lock_holder) when the segment
//      arrived while that participant held the mic.
//   2. Fallback: local participant when self-recorded, or "unknown" when
//      captured from a shared/room mic with no active floor.
//
// Overlap: if two segments have overlapping [start_ts, end_ts] windows they
// are marked as an overlap and the shorter one is flagged as `interruption`
// so the scoring layer can penalise interruption behaviour without discarding
// content.

export interface RawSegment {
  text: string;
  start_ts: number; // ms epoch
  end_ts: number;   // ms epoch
  confidence?: number;
  lang?: string;
  local?: boolean;  // true when captured from this device's mic
}

export interface AttributedSegment extends RawSegment {
  participant_id: string | null;
  attribution_source: "floor" | "local" | "unknown";
  interruption: boolean;
  overlap_seconds: number;
}

export interface FloorWindow {
  participant_id: string;
  from_ts: number;
  to_ts: number; // Infinity if still holding
}

export function attributeSegments(
  segments: RawSegment[],
  floor: FloorWindow[],
  localParticipantId: string | null,
): AttributedSegment[] {
  const sorted = [...segments].sort((a, b) => a.start_ts - b.start_ts);
  const result: AttributedSegment[] = [];

  for (const seg of sorted) {
    // Find whoever held the floor at seg.start_ts.
    const holder = floor.find(
      (f) => seg.start_ts >= f.from_ts && seg.start_ts <= f.to_ts,
    );

    let participant_id: string | null = null;
    let attribution_source: AttributedSegment["attribution_source"] = "unknown";

    if (holder) {
      participant_id = holder.participant_id;
      attribution_source = "floor";
    } else if (seg.local && localParticipantId) {
      participant_id = localParticipantId;
      attribution_source = "local";
    }

    // Overlap detection against previously accepted segments.
    let overlap_seconds = 0;
    let interruption = false;
    for (const prev of result) {
      if (prev.end_ts > seg.start_ts && prev.start_ts < seg.end_ts) {
        const overlapMs =
          Math.min(prev.end_ts, seg.end_ts) - Math.max(prev.start_ts, seg.start_ts);
        overlap_seconds = Math.max(overlap_seconds, overlapMs / 1000);
        // The later, shorter segment is treated as the interruption.
        const segDuration = seg.end_ts - seg.start_ts;
        const prevDuration = prev.end_ts - prev.start_ts;
        if (segDuration <= prevDuration) interruption = true;
      }
    }

    result.push({
      ...seg,
      participant_id,
      attribution_source,
      interruption,
      overlap_seconds: Number(overlap_seconds.toFixed(2)),
    });
  }

  return result;
}

/**
 * Cheap language guess. Prefer STT-provided `seg.lang` when present; otherwise
 * fall back to Unicode-block heuristics for the common Indian scripts + Latin.
 * Returns an ISO-639-1 code or "und".
 */
export function guessLanguage(text: string, hint?: string): string {
  if (hint) return hint;
  if (!text) return "und";
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari
  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[a-zA-Z]/.test(text)) return "en";
  return "und";
}
