/**
 * Validate and sanitize admin URL query params.
 * Falls back to safe defaults when values are missing or invalid.
 */
export const RANGE_VALUES = ["1d", "7d", "30d", "90d"] as const;
export type RangeValue = (typeof RANGE_VALUES)[number];

export const SESSION_STATUSES = ["all", "setup", "active", "paused", "completed"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_MODES = ["all", "solo", "multi"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export function safeRange(v: string | null | undefined): RangeValue | null {
  if (!v) return null;
  return (RANGE_VALUES as readonly string[]).includes(v) ? (v as RangeValue) : null;
}

export function safeStatus(v: string | null | undefined, def: SessionStatus = "all"): SessionStatus {
  if (!v) return def;
  return (SESSION_STATUSES as readonly string[]).includes(v) ? (v as SessionStatus) : def;
}

export function safeMode(v: string | null | undefined, def: SessionMode = "all"): SessionMode {
  if (!v) return def;
  return (SESSION_MODES as readonly string[]).includes(v) ? (v as SessionMode) : def;
}

export function rangeToDays(v: string | null | undefined): number | null {
  const r = safeRange(v);
  if (!r) return null;
  return parseInt(r, 10);
}

/** Sanitize free-text search: trim, cap length, strip control chars. */
export function safeSearch(v: string | null | undefined, maxLen = 120): string {
  if (!v) return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLen);
}
