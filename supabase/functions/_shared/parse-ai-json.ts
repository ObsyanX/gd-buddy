/**
 * Tolerant JSON parsing for AI responses.
 *
 * Models occasionally return JSON that is wrapped in markdown fences, prefixed
 * with prose, or — most commonly — truncated because the response hit the token
 * ceiling mid-string. A plain JSON.parse throws on all of those and the caller
 * ends up surfacing the raw escaped text to the user. This helper strips the
 * wrappers and, as a last resort, repairs an unterminated object so the fields
 * that DID arrive are still usable.
 */

function stripWrappers(raw: string): string {
  let text = raw.trim();
  // ```json ... ``` fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Leading prose before the first object/array
  const candidates = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  const start = candidates.length ? Math.min(...candidates) : -1;
  if (start > 0) text = text.slice(start);
  return text;
}

/** Close any string/array/object left open by a truncated response. */
function repairTruncated(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let out = text;
  // Drop a dangling escape that would break the closing quote.
  if (escaped) out = out.slice(0, -1);
  if (inString) out += '"';
  // Remove a trailing incomplete key/value fragment such as `, "tips":`
  out = out.replace(/,\s*"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");
  while (stack.length) {
    const open = stack.pop();
    out += open === "{" ? "}" : "]";
  }
  return out;
}

/**
 * Models sometimes double-encode the payload: the tool arguments hold a JSON
 * *string*, or the object is nested under a single wrapper key such as
 * { "provide_feedback": { ... } }. Peel those layers so callers always get the
 * real object instead of a stringified one leaking into the UI.
 */
function unwrap(value: unknown, depth = 0): unknown {
  if (depth > 5) return value;

  if (typeof value === "string") {
    const text = stripWrappers(value);
    if (!/^[{[]/.test(text)) return value;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      try {
        parsed = JSON.parse(repairTruncated(text));
      } catch {
        return value;
      }
    }
    return unwrap(parsed, depth + 1);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const inner = unwrap(obj[keys[0]], depth + 1);
      if (inner && typeof inner === "object") return inner;
    }
    // Un-stringify any nested JSON-looking values.
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && /^[{[]/.test(v.trim())) {
        const inner = unwrap(v, depth + 1);
        if (inner && typeof inner === "object") obj[k] = inner;
      }
    }
    return obj;
  }

  return value;
}

/**
 * Parse an AI-produced JSON payload. Returns null when nothing usable can be
 * recovered, so callers can fall back instead of throwing.
 */
export function parseAiJson<T = Record<string, unknown>>(raw: unknown): T | null {
  if (raw && typeof raw === "object") return (unwrap(raw) ?? null) as T | null;
  if (typeof raw !== "string" || !raw.trim()) return null;

  const text = stripWrappers(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(repairTruncated(text));
    } catch {
      return null;
    }
  }

  const result = unwrap(parsed);
  return result && typeof result === "object" ? (result as T) : null;
}
