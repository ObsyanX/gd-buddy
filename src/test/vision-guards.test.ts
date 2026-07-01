import { describe, it, expect } from "vitest";
import { computeEngagement, detectSpoof, type VisionFrameSignal } from "@/lib/vision-guards";

function frame(over: Partial<VisionFrameSignal>): VisionFrameSignal {
  return {
    ts: Date.now(),
    face_present: true,
    gaze_on_screen: true,
    head_yaw_deg: 0,
    blink_rate_hz: 0.25,
    frame_hash: Math.random().toString(36),
    ...over,
  };
}

describe("vision-guards", () => {
  it("scores an engaged participant high", () => {
    const frames = Array.from({ length: 30 }, () => frame({}));
    const snap = computeEngagement(frames);
    expect(snap.score).toBeGreaterThan(0.85);
    expect(snap.reasons).toHaveLength(0);
  });

  it("flags looking away", () => {
    const frames = Array.from({ length: 30 }, (_, i) =>
      frame({ gaze_on_screen: i % 5 === 0 }),
    );
    const snap = computeEngagement(frames);
    expect(snap.reasons).toContain("looking_away");
    expect(snap.gaze_ratio).toBeLessThan(0.5);
  });

  it("detects frozen frames as spoof", () => {
    const frames = Array.from({ length: 20 }, () => frame({ frame_hash: "ABC" }));
    const v = detectSpoof({ frames });
    expect(v.suspicious).toBe(true);
    expect(v.reasons).toContain("frozen_or_replayed_video");
  });

  it("detects flat-line audio", () => {
    const frames = Array.from({ length: 20 }, () => frame({}));
    const audio_rms_series = Array(30).fill(0.0000001);
    const v = detectSpoof({ frames, audio_rms_series });
    expect(v.reasons).toContain("flatline_audio");
  });

  it("clean signal is not suspicious", () => {
    const frames = Array.from({ length: 20 }, () => frame({}));
    const audio_rms_series = Array.from({ length: 30 }, () => Math.random());
    const v = detectSpoof({ frames, audio_rms_series });
    expect(v.suspicious).toBe(false);
  });
});
