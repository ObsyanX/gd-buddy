// Track 1 — PII masking utility. Cheap regex-based scrubber for logs, exports,
// and any text that leaves the app boundary. Not a substitute for real DLP.
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;
const CREDIT = /\b\d(?:[ -]?\d){12,18}\b/g;
const AADHAAR = /\b\d{4}\s?\d{4}\s?\d{4}\b/g; // India

export function maskPII(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(EMAIL, "[email]")
    .replace(CREDIT, "[card]")
    .replace(AADHAAR, "[id]")
    .replace(PHONE, "[phone]");
}

export function maskObject<T>(obj: T): T {
  if (obj == null) return obj;
  if (typeof obj === "string") return maskPII(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(maskObject) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = maskObject(v);
    }
    return out as T;
  }
  return obj;
}
