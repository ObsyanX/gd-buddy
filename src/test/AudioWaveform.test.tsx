import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AudioWaveform } from "@/components/AudioWaveform";

describe("AudioWaveform hook stability", () => {
  it("mounts and unmounts across recording state transitions without throwing", () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;

    // Idle → recording → idle → recording → unmount
    const { rerender, unmount } = render(<AudioWaveform isRecording={false} stream={null} />);
    expect(() => rerender(<AudioWaveform isRecording={true} stream={stream} />)).not.toThrow();
    expect(() => rerender(<AudioWaveform isRecording={false} stream={null} />)).not.toThrow();
    expect(() => rerender(<AudioWaveform isRecording={true} stream={stream} />)).not.toThrow();
    expect(() => unmount()).not.toThrow();
    cleanup();
  });
});
