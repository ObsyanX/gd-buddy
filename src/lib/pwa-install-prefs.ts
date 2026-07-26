// Centralized PWA install banner preferences.
// Single source of truth for snooze / dismiss timing, storage keys, and
// eligibility gating. Tweak the constants below to change UX everywhere.

export const PWA_PREFS = {
  storageKey: "pwa-install-prefs.v2",
  legacyKey: "pwa-install-dismissed-at",
  snoozeMs: 1000 * 60 * 60 * 24 * 7, // 7 days for "Later"
  dismissMs: 1000 * 60 * 60 * 24 * 30, // 30 days for "X"
  showAfterMs: 1500, // delay before showing on load
} as const;

export type SnoozeReason = "later" | "dismissed" | "installed";

interface StoredPrefs {
  reason: SnoozeReason;
  at: number;
}

function read(): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(PWA_PREFS.storageKey);
    if (raw) return JSON.parse(raw) as StoredPrefs;
    // migrate legacy timestamp key
    const legacy = Number(localStorage.getItem(PWA_PREFS.legacyKey) || 0);
    if (legacy) return { reason: "later", at: legacy };
  } catch {}
  return null;
}

function write(p: StoredPrefs) {
  try {
    localStorage.setItem(PWA_PREFS.storageKey, JSON.stringify(p));
  } catch {}
}

export function markSnoozed(reason: SnoozeReason) {
  write({ reason, at: Date.now() });
}

export function clearSnooze() {
  try {
    localStorage.removeItem(PWA_PREFS.storageKey);
    localStorage.removeItem(PWA_PREFS.legacyKey);
  } catch {}
}

/** Should the banner be suppressed right now due to a prior snooze/dismiss? */
export function isSnoozed(): boolean {
  const p = read();
  if (!p) return false;
  if (p.reason === "installed") return true;
  const ttl = p.reason === "dismissed" ? PWA_PREFS.dismissMs : PWA_PREFS.snoozeMs;
  return Date.now() - p.at < ttl;
}

/**
 * Runtime gating: verify the current browser is a viable PWA install target.
 * Returns false in-iframe, on http (except localhost), inside already-installed
 * standalone mode, or when no manifest link is present.
 */
export function isPWAInstallEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.top !== window.self) return false; // iframed preview
  } catch {
    return false;
  }
  const { protocol, hostname } = window.location;
  const isSecure = protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
  if (!isSecure) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true;
  if (standalone) return false;
  const hasManifest = !!document.querySelector('link[rel="manifest"]');
  return hasManifest;
}
