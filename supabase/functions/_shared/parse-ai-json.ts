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
 * Parse an AI-produced JSON payload. Returns null when nothing usable can be
 * recovered, so callers can fall back instead of throwing.
 */
export function parseAiJson<T = Record<string, unknown>>(raw: unknown): T | null {
  if (raw && typeof raw === "object") return raw as T;
  if (typeof raw !== "string" || !raw.trim()) return null;

  const text = stripWrappers(raw);

  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through to repair
  }

  try {
    return JSON.parse(repairTruncated(text)) as T;
  } catch {
    return null;
  }
}
