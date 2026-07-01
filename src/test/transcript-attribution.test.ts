import { describe, it, expect } from "vitest";
import { attributeSegments, guessLanguage } from "@/lib/transcript-attribution";

describe("transcript-attribution", () => {
  const floor = [
    { participant_id: "A", from_ts: 0, to_ts: 5_000 },
    { participant_id: "B", from_ts: 5_000, to_ts: 10_000 },
  ];

  it("attributes segments to the current floor holder", () => {
    const out = attributeSegments(
      [
        { text: "hello", start_ts: 1_000, end_ts: 2_000 },
        { text: "world", start_ts: 6_000, end_ts: 7_000 },
      ],
      floor,
      null,
    );
    expect(out[0].participant_id).toBe("A");
    expect(out[1].participant_id).toBe("B");
    expect(out.every((s) => s.attribution_source === "floor")).toBe(true);
  });

  it("falls back to local participant when no floor is held", () => {
    const out = attributeSegments(
      [{ text: "aside", start_ts: 20_000, end_ts: 21_000, local: true }],
      floor,
      "ME",
    );
    expect(out[0].participant_id).toBe("ME");
    expect(out[0].attribution_source).toBe("local");
  });

  it("detects overlap and flags the shorter segment as interruption", () => {
    const out = attributeSegments(
      [
        { text: "long", start_ts: 1_000, end_ts: 4_000 },
        { text: "cut", start_ts: 2_000, end_ts: 2_500 },
      ],
      floor,
      null,
    );
    expect(out[1].interruption).toBe(true);
    expect(out[1].overlap_seconds).toBeGreaterThan(0);
  });

  it("guessLanguage handles common scripts", () => {
    expect(guessLanguage("hello")).toBe("en");
    expect(guessLanguage("नमस्ते")).toBe("hi");
    expect(guessLanguage("வணக்கம்")).toBe("ta");
    expect(guessLanguage("", "bn")).toBe("bn");
  });
});
