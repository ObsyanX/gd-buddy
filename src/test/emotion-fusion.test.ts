import { describe, it, expect } from "vitest";
import { fuseEmotion } from "@/lib/behaviour/emotion-fusion";

describe("emotion fusion", () => {
  it("returns neutral when both signals are null", () => {
    const f = fuseEmotion(null, null);
    expect(f.label).toBe("neutral");
    expect(f.confidence).toBe(0);
  });

  it("passes through single-source signals with PII masked", () => {
    const f = fuseEmotion(
      {
        source: "text",
        label: "positive",
        valence: 0.6,
        arousal: 0.4,
        confidence: 0.8,
        rationale: "user contact test@example.com happy about topic",
      },
      null,
    );
    expect(f.label).toBe("positive");
    const evidence = f.evidence.text as { rationale: string };
    expect(evidence.rationale).not.toContain("test@example.com");
    expect(evidence.rationale).toContain("[email]");
  });

  it("labels fused signal as angry when arousal high and valence very negative", () => {
    const f = fuseEmotion(
      { source: "text", label: "negative", valence: -0.7, arousal: 0.6, confidence: 0.8 },
      { source: "prosody", label: "angry", valence: -0.4, arousal: 0.9, confidence: 0.6 },
    );
    expect(f.label).toBe("angry");
    expect(f.arousal).toBeGreaterThan(0.7);
    expect(f.valence).toBeLessThan(-0.3);
  });

  it("labels calm when arousal low and valence neutral", () => {
    const f = fuseEmotion(
      { source: "text", label: "neutral", valence: 0.05, arousal: 0.1, confidence: 0.7 },
      { source: "prosody", label: "calm", valence: 0, arousal: 0.15, confidence: 0.5 },
    );
    expect(f.label).toBe("calm");
  });

  it("prosody-only path still produces valid confidence in [0,1]", () => {
    const f = fuseEmotion(null, {
      source: "prosody",
      label: "excited",
      valence: 0.4,
      arousal: 0.8,
      confidence: 0.5,
    });
    expect(f.confidence).toBeGreaterThan(0);
    expect(f.confidence).toBeLessThanOrEqual(1);
  });
});
