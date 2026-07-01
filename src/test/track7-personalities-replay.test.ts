import { describe, expect, it } from "vitest";
import { composePrompt, type ModeratorPersonality } from "@/lib/personalities/moderator-persona";
import { eventsUpTo, type ReplayEvent } from "@/lib/replay/replay-player";

const p: ModeratorPersonality = {
  id: "1",
  name: "Strict",
  description: null,
  tone: "firm",
  intervention_rate: 0.8,
  strictness: 0.9,
  encouragement: 0.2,
  policy_overrides: {},
  prompt_template: "Cut off drift immediately.",
  is_default: false,
};

describe("Track 7: moderator personality", () => {
  it("composes a prompt containing tone and knobs", () => {
    const out = composePrompt("You are a GD moderator.", p);
    expect(out).toContain("firm");
    expect(out).toContain("80%");
    expect(out).toContain("90%");
    expect(out).toContain("Cut off drift");
  });

  it("keeps base prompt at the top", () => {
    const out = composePrompt("BASE_PROMPT", p);
    expect(out.startsWith("BASE_PROMPT")).toBe(true);
  });
});

const mkEvent = (offset_ms: number, id: string): ReplayEvent => ({
  id,
  offset_ms,
  event_type: "message",
  actor_id: null,
  actor_kind: "human",
  payload: {},
});

describe("Track 7: replay player scrub", () => {
  const events = [0, 100, 250, 400, 999].map((o, i) => mkEvent(o, String(i)));

  it("returns empty before first event", () => {
    expect(eventsUpTo(events, -1)).toEqual([]);
  });

  it("includes events up to cursor inclusive", () => {
    expect(eventsUpTo(events, 250)).toHaveLength(3);
    expect(eventsUpTo(events, 249)).toHaveLength(2);
  });

  it("returns all events at or past duration", () => {
    expect(eventsUpTo(events, 5000)).toHaveLength(5);
  });

  it("handles empty event list", () => {
    expect(eventsUpTo([], 100)).toEqual([]);
  });
});
