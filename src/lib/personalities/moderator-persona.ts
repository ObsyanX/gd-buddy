// Track 7: Moderator personality resolution and prompt composition.
import { supabase } from "@/integrations/supabase/client";

export interface ModeratorPersonality {
  id: string;
  name: string;
  description: string | null;
  tone: string;
  intervention_rate: number;
  strictness: number;
  encouragement: number;
  policy_overrides: Record<string, unknown>;
  prompt_template: string | null;
  is_default: boolean;
}

let cache: ModeratorPersonality[] | null = null;

export async function loadPersonalities(force = false): Promise<ModeratorPersonality[]> {
  if (cache && !force) return cache;
  const { data, error } = await supabase
    .from("moderator_personalities")
    .select("*")
    .order("is_default", { ascending: false });
  if (error) throw error;
  cache = (data ?? []) as ModeratorPersonality[];
  return cache;
}

export async function getPersonalityById(id: string | null | undefined): Promise<ModeratorPersonality | null> {
  const list = await loadPersonalities();
  if (!id) return list.find((p) => p.is_default) ?? list[0] ?? null;
  return list.find((p) => p.id === id) ?? list.find((p) => p.is_default) ?? null;
}

/**
 * Compose a system prompt from a personality, layered over a base prompt.
 * Higher intervention_rate → more proactive nudges.
 * Higher strictness → firmer language and shorter tolerance for drift.
 * Higher encouragement → more affirmations and inclusive prompts.
 */
export function composePrompt(base: string, p: ModeratorPersonality): string {
  const tone = p.tone || "balanced";
  const knobs = [
    `Tone: ${tone}`,
    `Intervention rate: ${(p.intervention_rate * 100).toFixed(0)}% (higher = intervene sooner).`,
    `Strictness: ${(p.strictness * 100).toFixed(0)}% (higher = enforce time and topic firmly).`,
    `Encouragement: ${(p.encouragement * 100).toFixed(0)}% (higher = uplift quieter voices).`,
  ].join("\n");
  const template = p.prompt_template?.trim();
  return [base.trim(), "", "Moderator personality:", knobs, template ? `\nStyle guide:\n${template}` : ""]
    .filter(Boolean)
    .join("\n");
}
