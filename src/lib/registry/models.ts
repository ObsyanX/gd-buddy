/**
 * Track 9.7 — Central AI Model Registry (client helper).
 *
 * Never hardcode model IDs in feature code. Ask the registry for the currently
 * active model for a given purpose. Callers should also record `model_id` in
 * `ai_costs` whenever they issue an AI request so cost + benchmarking can join
 * back to the exact model version used.
 */
import { supabase } from "@/integrations/supabase/client";

export type ModelPurpose =
  | "reasoning"
  | "embedding"
  | "fact"
  | "evaluation"
  | "coaching"
  | "graph"
  | "report"
  | "fallback"
  | "moderation"
  | "completion"
  | "emotion";

export interface AIModelRow {
  id: string;
  purpose: ModelPurpose;
  vendor: string;
  model_id: string;
  version: string;
  params: Record<string, unknown>;
  active: boolean;
}

const cache = new Map<string, { row: AIModelRow; expires: number }>();
const TTL_MS = 60_000;

export async function getActiveModel(purpose: ModelPurpose): Promise<AIModelRow | null> {
  const now = Date.now();
  const cached = cache.get(purpose);
  if (cached && cached.expires > now) return cached.row;

  const { data, error } = await supabase
    .from("ai_models")
    .select("id, purpose, vendor, model_id, version, params, active")
    .eq("purpose", purpose)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as AIModelRow;
  cache.set(purpose, { row, expires: now + TTL_MS });
  return row;
}

export function invalidateModelCache(purpose?: ModelPurpose): void {
  if (purpose) cache.delete(purpose);
  else cache.clear();
}
