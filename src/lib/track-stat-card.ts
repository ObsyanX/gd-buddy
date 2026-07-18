/**
 * StatCard click tracking.
 * Sends events to the `track-event` edge function which persists them
 * server-side into `audit_events`. Fire-and-forget; never blocks navigation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface StatCardTracking {
  page: string;
  card: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
  destination?: string;
}

export function trackStatCardClick(t: StatCardTracking) {
  const payload = {
    type: "statcard_click",
    page: t.page,
    card: t.card,
    destination: t.destination ?? null,
    filters: t.filters ?? {},
    path: typeof window !== "undefined" ? window.location.pathname : null,
    at: new Date().toISOString(),
  };
  try {
    // Best-effort; ignore failures so navigation is never blocked.
    void supabase.functions.invoke("track-event", { body: payload }).catch(() => undefined);
  } catch {
    /* noop */
  }
}
