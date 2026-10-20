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
