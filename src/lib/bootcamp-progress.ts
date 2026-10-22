// Bootcamp progress: single source of truth shared by the Bootcamp list,
// day pages, session setup and the session report.
//
// Progress is kept in localStorage for instant reads AND mirrored to the
// bootcamp_progress table so it survives sign-out / new devices.

import { supabase } from "@/integrations/supabase/client";

export const BOOTCAMP_STORAGE_KEY = "gd_bootcamp_progress_v1";

export interface BootcampProgress {
  completedDays: number[];
  currentDay: number;
  streak: number;
  lastCompletedAt?: string;
}

export interface SessionBootcampInfo {
  day: number;
  passScore: number;
  durationMinutes: number;
  aggressiveness: string;
  /** "low" | "medium" | "high"; older sessions may not have it. */
  interruptionLevel?: string;
}

const EMPTY: BootcampProgress = { completedDays: [], currentDay: 1, streak: 0 };

export const readLocalProgress = (): BootcampProgress => {
  try {
    const s = localStorage.getItem(BOOTCAMP_STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      return {
        completedDays: Array.isArray(p.completedDays) ? p.completedDays : [],
        currentDay: typeof p.currentDay === "number" ? p.currentDay : 1,
        streak: typeof p.streak === "number" ? p.streak : 0,
        lastCompletedAt: p.lastCompletedAt,
      };
    }
  } catch {}
  return { ...EMPTY };
};

export const writeLocalProgress = (p: BootcampProgress) => {
  localStorage.setItem(BOOTCAMP_STORAGE_KEY, JSON.stringify(p));
};

/** Per-session bootcamp context, stored when a bootcamp day launches a room. */
export const setSessionBootcamp = (sessionId: string, info: SessionBootcampInfo) => {
  localStorage.setItem(`gd-bootcamp-${sessionId}`, JSON.stringify(info));
};

export const getSessionBootcamp = (sessionId: string): SessionBootcampInfo | null => {
  try {
    const s = localStorage.getItem(`gd-bootcamp-${sessionId}`);
    if (s) return JSON.parse(s) as SessionBootcampInfo;
  } catch {}
  return null;
};

/**
 * Merge account-saved progress into local storage (and push any local-only
 * days up to the account). Call once when a signed-in user opens Bootcamp.
 */
export async function syncProgressFromAccount(userId: string): Promise<BootcampProgress> {
  const local = readLocalProgress();
  const { data, error } = await supabase
    .from("bootcamp_progress")
    .select("day")
    .eq("user_id", userId);
  if (error || !data) return local;

  const dbDays = data.map((r) => r.day);
  const merged = Array.from(new Set([...local.completedDays, ...dbDays])).sort((a, b) => a - b);
  const next: BootcampProgress = {
    ...local,
    completedDays: merged,
    currentDay: Math.min(14, Math.max(local.currentDay || 1, (merged[merged.length - 1] ?? 0) + 1)),
  };
  writeLocalProgress(next);

  const localOnly = local.completedDays.filter((d) => !dbDays.includes(d));
  if (localOnly.length > 0) {
    await supabase.from("bootcamp_progress").upsert(
      localOnly.map((day) => ({ user_id: userId, day })),
      { onConflict: "user_id,day" },
    );
  }
  return next;
}

/**
 * Mark a day complete locally and on the account. Safe to call repeatedly —
 * the day is only added once and the streak only increments the first time.
 */
export async function completeBootcampDay(
  day: number,
  opts?: { score?: number | null; sessionId?: string },
): Promise<BootcampProgress> {
  const p = readLocalProgress();
  if (!p.completedDays.includes(day)) {
    p.completedDays = [...p.completedDays, day].sort((a, b) => a - b);
    p.streak = (p.streak || 0) + 1;
  }
  p.currentDay = Math.min(14, Math.max(p.currentDay || 1, day + 1));
  p.lastCompletedAt = new Date().toISOString();
  writeLocalProgress(p);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("bootcamp_progress").upsert(
      {
        user_id: user.id,
        day,
        score: opts?.score ?? null,
        session_id: opts?.sessionId ?? null,
        completed_at: p.lastCompletedAt,
      },
      { onConflict: "user_id,day" },
    );
  }
  return p;
}

// ---------------------------------------------------------------------------
// Bootcamp AI pushiness
//
// The moderator AI reads each AI participant's interrupt level and
// agreeability, so a bootcamp day's style is applied by tuning those two
// values when the room's AI participants are created. The day's
// interruption level is tuned separately from its style so a day can be
// "balanced" in tone yet still have AI participants who cut in often.
// ---------------------------------------------------------------------------

export type BootcampAggressiveness = "gentle" | "balanced" | "aggressive";
export type BootcampInterruptionLevel = "low" | "medium" | "high";

export const PUSHINESS_LIMITS = {
  gentle: { maxInterrupt: 0.15, minAgreeability: 0.3 },
  aggressive: { minInterrupt: 0.6, maxAgreeability: -0.1 },
} as const;

/** Interruption level a style implies when a day does not set its own. */
export const defaultInterruptionFor = (style: string | undefined): BootcampInterruptionLevel =>
  style === "gentle" ? "low" : style === "aggressive" ? "high" : "medium";

/** The interruption mode sent to the moderator AI for each level. */
export const interruptionModeFor = (
  level: string | undefined,
): "light" | "moderate" | "frequent" =>
  level === "high" ? "frequent" : level === "medium" ? "moderate" : "light";

export const INTERRUPTION_LABELS: Record<BootcampInterruptionLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const applyBootcampPushiness = <
  T extends { interrupt_level: number; agreeability: number },
>(
  persona: T,
  level: string | undefined,
  interruption: BootcampInterruptionLevel = defaultInterruptionFor(level),
): T => {
  let agreeability = persona.agreeability;
  if (level === "gentle") agreeability = Math.max(agreeability, PUSHINESS_LIMITS.gentle.minAgreeability);
  if (level === "aggressive") agreeability = Math.min(agreeability, PUSHINESS_LIMITS.aggressive.maxAgreeability);

  let interrupt_level = persona.interrupt_level;
  if (interruption === "low") interrupt_level = Math.min(interrupt_level, PUSHINESS_LIMITS.gentle.maxInterrupt);
  if (interruption === "high") interrupt_level = Math.max(interrupt_level, PUSHINESS_LIMITS.aggressive.minInterrupt);

  if (agreeability === persona.agreeability && interrupt_level === persona.interrupt_level) return persona;
  return { ...persona, interrupt_level, agreeability };
};
