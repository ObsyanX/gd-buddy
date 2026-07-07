/** Stable per-browser visitor id (localStorage, no PII). */
const KEY = "gdb_visitor_id";
export function getVisitorId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "anonymous";
  }
}
