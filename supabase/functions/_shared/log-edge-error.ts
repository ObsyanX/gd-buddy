// Shared structured logger for edge functions.
// Writes to public.error_logs so the admin "Edge errors" dashboard can display + alert.
// Non-blocking: swallows its own failures so it never surfaces a secondary error to callers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export interface EdgeErrorContext {
  function_name: string;
  status?: number;
  request_id?: string;
  user_id?: string | null;
  path?: string;
  extra?: Record<string, unknown>;
}

export async function logEdgeError(err: unknown, ctx: EdgeErrorContext): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const asError = err instanceof Error ? err : new Error(typeof err === "string" ? err : safeStringify(err));
    const payload = {
      user_id: ctx.user_id ?? null,
      error_message: asError.message?.slice(0, 2000) ?? "unknown error",
      error_stack: asError.stack?.slice(0, 8000) ?? null,
      error_source: `edge_${ctx.function_name}`,
      page_url: ctx.path ?? null,
      metadata: {
        status: ctx.status ?? 500,
        request_id: ctx.request_id ?? null,
        function_name: ctx.function_name,
        ...(ctx.extra ?? {}),
      },
    };

    // Also emit a JSON line to stdout — picked up by Supabase edge logs for correlation.
    console.error(JSON.stringify({ level: "error", ...payload }));

    await supabase.from("error_logs").insert(payload as never);
  } catch (_) {
    // Silent — logging must never fail the caller.
  }
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v); } catch { return String(v); }
}
