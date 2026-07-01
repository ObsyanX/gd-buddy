import { describe, it, expect, vi } from "vitest";
import {
  safeCloseAudioContext,
  safeStopMediaStream,
  safeDisconnectAudioNode,
} from "@/lib/audio-utils";

describe("audio-utils", () => {
  it("closes an open AudioContext exactly once", async () => {
    const ctx = new AudioContext();
    await safeCloseAudioContext(ctx);
    expect(ctx.state).toBe("closed");
  });

  it("is idempotent — does not throw on double close", async () => {
    const ctx = new AudioContext();
    await safeCloseAudioContext(ctx);
    await expect(safeCloseAudioContext(ctx)).resolves.toBeUndefined();
    await expect(safeCloseAudioContext(null)).resolves.toBeUndefined();
    await expect(safeCloseAudioContext(undefined)).resolves.toBeUndefined();
  });

  it("stops all live MediaStream tracks and skips ended ones", () => {
    const stop = vi.fn();
    const tracks = [
      { readyState: "live", stop },
      { readyState: "ended", stop },
    ];
    const stream = { getTracks: () => tracks } as unknown as MediaStream;
    safeStopMediaStream(stream);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("disconnects nodes and swallows already-disconnected errors", () => {
    const node = {
      disconnect: () => {
        throw new Error("node already disconnected");
      },
    } as unknown as AudioNode;
    expect(() => safeDisconnectAudioNode(node)).not.toThrow();
    expect(() => safeDisconnectAudioNode(null)).not.toThrow();
  });
});
