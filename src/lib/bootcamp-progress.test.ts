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
