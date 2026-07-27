// Install / join attribution: capture ?ref= (and share kind) on any page
// load, persist for 30 days, and expose helpers to attach the last-known
// ref to conversion events (PWA install, multiplayer join).

const KEY = "gdb.attribution.v1";
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type AttributionKind = "profile" | "report" | "invite" | "multiplayer" | "generic";

export interface Attribution {
  ref: string;
  kind?: AttributionKind;
  path?: string;
  at: number;
}

function read(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Attribution;
    if (!p?.ref || Date.now() - p.at > TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}

function write(a: Attribution) {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
}

/** Read `?ref=` (and optional `?k=`) from the current URL and persist. */
export function captureAttributionFromUrl(): Attribution | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const ref = url.searchParams.get("ref");
  if (!ref) return read();
  const kind = (url.searchParams.get("k") as AttributionKind | null) ?? inferKindFromPath(url.pathname);
  const a: Attribution = { ref, kind, path: url.pathname, at: Date.now() };
  write(a);
  return a;
}

function inferKindFromPath(path: string): AttributionKind {
  if (path.startsWith("/p/")) return "profile";
  if (path.startsWith("/r/")) return "report";
  if (path.startsWith("/join/")) return "multiplayer";
  if (path.startsWith("/i/")) return "invite";
  return "generic";
}

export function getAttribution(): Attribution | null {
  return read();
}

export function clearAttribution() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
