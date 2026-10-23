import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(),
  },
}));

import {
  BOOTCAMP_STORAGE_KEY,
  readLocalProgress,
  completeBootcampDay,
  setSessionBootcamp,
  getSessionBootcamp,
} from "./bootcamp-progress";

describe("bootcamp progress", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty with day 1 current", () => {
    const p = readLocalProgress();
    expect(p.completedDays).toEqual([]);
    expect(p.currentDay).toBe(1);
  });

  it("completing a day unlocks the next day", async () => {
    const p = await completeBootcampDay(1);
    expect(p.completedDays).toEqual([1]);
    expect(p.currentDay).toBe(2);
    expect(p.streak).toBe(1);
  });

  it("completing the same day twice does not double-count", async () => {
    await completeBootcampDay(3);
    const p = await completeBootcampDay(3);
    expect(p.completedDays).toEqual([3]);
    expect(p.streak).toBe(1);
    expect(p.currentDay).toBe(4);
  });

  it("never advances currentDay past 14", async () => {
    const p = await completeBootcampDay(14);
    expect(p.currentDay).toBe(14);
  });

  it("persists to localStorage across reads", async () => {
    await completeBootcampDay(2, { score: 78 });
    const raw = JSON.parse(localStorage.getItem(BOOTCAMP_STORAGE_KEY)!);
    expect(raw.completedDays).toEqual([2]);
    expect(readLocalProgress().completedDays).toEqual([2]);
  });

  it("stores and reads per-session bootcamp context", () => {
    setSessionBootcamp("sess-1", { day: 5, passScore: 70, durationMinutes: 12, aggressiveness: "aggressive" });
    expect(getSessionBootcamp("sess-1")).toEqual({ day: 5, passScore: 70, durationMinutes: 12, aggressiveness: "aggressive" });
    expect(getSessionBootcamp("other")).toBeNull();
  });
});

import { applyBootcampPushiness } from "./bootcamp-progress";

describe("bootcamp AI pushiness", () => {
  const polite = { interrupt_level: 0.1, agreeability: 0.6 };
  const pushy = { interrupt_level: 0.5, agreeability: -0.4 };

  it("aggressive days make every AI participant interrupt more and agree less", () => {
    expect(applyBootcampPushiness(polite, "aggressive")).toEqual({ interrupt_level: 0.6, agreeability: -0.1 });
  });

  it("gentle days calm down pushy AI participants", () => {
    expect(applyBootcampPushiness(pushy, "gentle")).toEqual({ interrupt_level: 0.15, agreeability: 0.3 });
  });

  it("balanced days keep each AI participant's own style", () => {
    expect(applyBootcampPushiness(pushy, "balanced")).toEqual(pushy);
  });
});

import { BOOTCAMP_LESSONS } from "@/data/bootcamp-curriculum";
import { PERSONA_TEMPLATES } from "@/config/personas";
import { interruptionModeFor, defaultInterruptionFor } from "./bootcamp-progress";

describe("bootcamp interruption level", () => {
  it("Day 10 has a high interruption level", () => {
    expect(BOOTCAMP_LESSONS[10].simulationPreset.interruptionLevel).toBe("high");
  });

  it("Day 10 makes every AI participant interrupt at least 0.6 while keeping a balanced tone", () => {
    const p = BOOTCAMP_LESSONS[10].simulationPreset;
    for (const id of p.personaIds) {
      const base = PERSONA_TEMPLATES.find((t) => t.id === id)!;
      const tuned = applyBootcampPushiness(base, p.aiAggressiveness, p.interruptionLevel);
      expect(tuned.interrupt_level).toBeGreaterThanOrEqual(0.6);
      expect(tuned.agreeability).toBe(base.agreeability);
    }
  });

  it("high interruption tells the moderator AI to use frequent interruptions", () => {
    expect(interruptionModeFor("high")).toBe("frequent");
    expect(interruptionModeFor("medium")).toBe("moderate");
    expect(interruptionModeFor("low")).toBe("light");
  });

  it("days without their own level follow their style", () => {
    expect(defaultInterruptionFor("gentle")).toBe("low");
    expect(defaultInterruptionFor("balanced")).toBe("medium");
    expect(defaultInterruptionFor("aggressive")).toBe("high");
    expect(BOOTCAMP_LESSONS[1].simulationPreset.interruptionLevel).toBe("low");
  });
});
