/**
 * Track 9.8 — Prompt Registry (client helper).
 *
 * All AI prompts live in the `prompts` table with (category, version, language,
 * org_id, ab_flag). Application code fetches by category + optional org/lang
 * so prompts can be swapped, A/B tested, and localized without a redeploy.
 */
import { supabase } from "@/integrations/supabase/client";

export type PromptCategory =
  | "moderator"
  | "coaching"
  | "conclusion"
  | "counterargument"
  | "fact"
  | "reflection"
  | "report"
  | "reasoning"
  | "completion"
  | "graph"
  | "emotion"
  | "safety";

export interface PromptRow {
  id: string;
  category: PromptCategory;
  version: string;
  language: string;
  org_id: string | null;
  body: string;
  ab_flag: string | null;
  active: boolean;
}

interface FetchOptions {
  language?: string;
  orgId?: string | null;
  abFlag?: string | null;
}

const cache = new Map<string, { row: PromptRow; expires: number }>();
const TTL_MS = 30_000;

function key(cat: PromptCategory, opts: FetchOptions): string {
  return `${cat}|${opts.language ?? "en"}|${opts.orgId ?? "GLOBAL"}|${opts.abFlag ?? ""}`;
}

export async function getPrompt(
  category: PromptCategory,
  opts: FetchOptions = {},
): Promise<PromptRow | null> {
  const now = Date.now();
  const k = key(category, opts);
  const cached = cache.get(k);
  if (cached && cached.expires > now) return cached.row;

  const language = opts.language ?? "en";
  // Prefer org-scoped prompt, fall back to global.
  let query = supabase
    .from("prompts")
    .select("id, category, version, language, org_id, body, ab_flag, active")
    .eq("category", category)
    .eq("active", true)
    .eq("language", language)
    .order("version", { ascending: false })
    .limit(1);

  if (opts.orgId) query = query.eq("org_id", opts.orgId);
  else query = query.is("org_id", null);
  if (opts.abFlag) query = query.eq("ab_flag", opts.abFlag);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  const row = data as PromptRow;
  cache.set(k, { row, expires: now + TTL_MS });
  return row;
}

export function invalidatePromptCache(): void {
  cache.clear();
}
