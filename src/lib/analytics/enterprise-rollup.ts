// Track 7: Enterprise analytics client helpers.
import { supabase } from "@/integrations/supabase/client";

export interface EnterpriseDaily {
  day: string;
  sessions_count: number;
  participants_count: number;
  avg_health: number | null;
  avg_radar: Record<string, number>;
  tokens_used: number;
}

export async function fetchEnterpriseDaily(orgId: string, days = 30): Promise<EnterpriseDaily[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("enterprise_metrics_daily")
    .select("day, sessions_count, participants_count, avg_health, avg_radar, tokens_used")
    .eq("org_id", orgId)
    .gte("day", since)
    .order("day", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EnterpriseDaily[];
}
