import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/room-log", () => ({ logRoomEvent: () => {} }));

import { isSlotOver } from "@/hooks/useTurnQueue";

describe("speaking slot expiry", () => {
  const granted = "2026-10-25T10:00:00.000Z";
  const t = (s: number) => new Date(granted).getTime() + s * 1000;

  it("a 45-second slot is still running at 44 seconds", () => {
    expect(isSlotOver({ granted_at: granted, slot_seconds: 45 }, t(44))).toBe(false);
  });

  it("a 45-second slot counts as over shortly after it ends", () => {
    expect(isSlotOver({ granted_at: granted, slot_seconds: 45 }, t(48))).toBe(true);
  });

  it("uses 45 seconds when the slot length is missing", () => {
    expect(isSlotOver({ granted_at: granted, slot_seconds: null }, t(46))).toBe(false);
    expect(isSlotOver({ granted_at: granted, slot_seconds: null }, t(48))).toBe(true);
  });

  it("a slot that was never granted is not over", () => {
    expect(isSlotOver({ granted_at: null, slot_seconds: 45 }, t(500))).toBe(false);
  });
});
