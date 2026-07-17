/**
 * Lightweight StatCard click tracking.
 * Logs to console (dev + prod for debugging) and attempts a fire-and-forget
 * insert into `analytics_events` when the table is available. Failures are
 * swallowed so tracking never blocks navigation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface StatCardTracking {
  /** Source page, e.g. "admin_analytics" */
  page: string;
  /** Human label of the clicked card, e.g. "Total users" */
  card: string;
  /** Filter metadata attached to the destination link */
  filters?: Record<string, string | number | boolean | null | undefined>;
  /** Destination href */
  destination?: string;
}

export function trackStatCardClick(t: StatCardTracking) {
  try {
    // Debug-friendly console line — visible in production for issue reports.
    // eslint-disable-next-line no-console
    console.info("[statcard]", t.page, "→", t.card, t.filters ?? {}, t.destination ?? "");
  } catch {
    /* noop */
  }

  // Best-effort persistence. `analytics_events` may or may not exist; ignore errors.
  try {
    const payload = {
      event: "statcard_click",
      page: t.page,
      card: t.card,
      destination: t.destination ?? null,
      filters: t.filters ?? {},
      at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    if (client?.from) {
      client
        .from("analytics_events")
        .insert({
          event_type: "statcard_click",
          metadata: payload,
        })
        .then(() => undefined, () => undefined);
    }
  } catch {
    /* noop */
  }
}
