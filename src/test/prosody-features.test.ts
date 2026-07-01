import { describe, it, expect } from "vitest";
import { extractProsody, prosodyEmotion, rollupProsody } from "@/lib/behaviour/prosody-features";

function sine(freq: number, samples: number, sampleRate: number, amp = 0.5): Float32Array {
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return out;
}

describe("prosody features", () => {
  it("returns silent features for empty frames", () => {
    const f = extractProsody({ samples: new Float32Array(0), sampleRate: 16000 });
    expect(f.voiced).toBe(false);
    expect(f.pitchHz).toBe(0);
    expect(f.energyRms).toBe(0);
  });

  it("detects a voiced 200 Hz tone within tolerance", () => {
    const samples = sine(200, 4096, 16000, 0.5);
    const f = extractProsody({ samples, sampleRate: 16000 });
    expect(f.voiced).toBe(true);
    expect(f.energyRms).toBeGreaterThan(0.1);
    expect(f.pitchHz).toBeGreaterThan(150);
    expect(f.pitchHz).toBeLessThan(260);
  });

  it("rolls up voiced frames and drops silence", () => {
    const voiced = extractProsody({ samples: sine(180, 4096, 16000, 0.4), sampleRate: 16000 });
    const silent = extractProsody({ samples: new Float32Array(4096), sampleRate: 16000 });
    const roll = rollupProsody([voiced, silent, voiced]);
    expect(roll.voiced).toBe(true);
    expect(roll.pitchHz).toBeGreaterThan(0);
  });

  it("prosodyEmotion labels neutral when unvoiced", () => {
    const e = prosodyEmotion({ pitchHz: 0, pitchVarHz: 0, energyRms: 0, zeroCrossingRate: 0, voiced: false });
    expect(e.label).toBe("neutral");
    expect(e.arousal).toBe(0);
  });

  it("prosodyEmotion produces higher arousal for loud + noisy frames", () => {
    const calm = prosodyEmotion({ pitchHz: 150, pitchVarHz: 0, energyRms: 0.05, zeroCrossingRate: 0.05, voiced: true });
    const loud = prosodyEmotion({ pitchHz: 140, pitchVarHz: 0, energyRms: 0.35, zeroCrossingRate: 0.35, voiced: true });
    expect(loud.arousal).toBeGreaterThan(calm.arousal);
  });
});
