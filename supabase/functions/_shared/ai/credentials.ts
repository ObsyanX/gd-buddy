// Per-user provider credentials: loading, decryption, circuit breaking and
// event/usage recording. Service-role access only — never exposed to browsers.

import { decryptSecret, redact } from "./crypto.ts";
import type { Category } from "./adapters.ts";
import type { ClassifiedError } from "./errors.ts";
import { isAccountBlocked } from "./errors.ts";

export interface UserCredential {
  id: string;
  provider: string;
  category: Category;
  model: string | null;
  priority: number;
  enabled: boolean;
  disabled_until: string | null;
  consecutive_failures: number;
  encrypted_key: string;
}

export interface UserPrefs {
  preferred_text: string | null;
  preferred_voice: string | null;
  preferred_stt: string | null;
  preferred_vision: string | null;
  platform_fallback: boolean;
  priority_order: Record<string, string[]> | null;
}

const DEFAULT_PREFS: UserPrefs = {
  preferred_text: null,
  preferred_voice: null,
  preferred_stt: null,
  preferred_vision: null,
  platform_fallback: true,
  priority_order: null,
};

function svc(): { url: string; key: string } | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? { url, key } : null;
}

function headers(key: string, prefer?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

async function rest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const s = svc();
  if (!s) return null;
  try {
    const res = await fetch(`${s.url}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers(s.key, (init?.headers as Record<string, string>)?.Prefer), ...(init?.headers as Record<string, string> ?? {}) },
    });
    if (!res.ok) {
      console.warn("[byok] rest error", res.status, redact(await res.text()));
      return null;
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (e) {
    console.warn("[byok] rest failed:", redact((e as Error).message));
    return null;
  }
}

export async function loadPrefs(userId: string): Promise<UserPrefs> {
  const rows = await rest<UserPrefs[]>(
    `user_ai_preferences?user_id=eq.${userId}&select=*`,
  );
  return rows?.[0] ? { ...DEFAULT_PREFS, ...rows[0] } : { ...DEFAULT_PREFS };
}

/** Enabled, non-circuit-broken credentials for a category, in call order. */
export async function loadCredentials(
  userId: string,
  category: Category,
  prefs: UserPrefs,
): Promise<UserCredential[]> {
  const rows = await rest<UserCredential[]>(
    `user_provider_credentials?user_id=eq.${userId}&category=eq.${category}&enabled=is.true&select=*`,
  );
  if (!rows?.length) return [];

  const now = Date.now();
  const open = rows.filter(
    (r) => !r.disabled_until || new Date(r.disabled_until).getTime() <= now,
  );

  const preferred =
    (prefs as unknown as Record<string, string | null>)[`preferred_${category}`] ?? null;
  const order = prefs.priority_order?.[category] ?? [];

  return open.sort((a, b) => {
    if (a.provider === preferred) return -1;
    if (b.provider === preferred) return 1;
    const ia = order.indexOf(a.provider);
    const ib = order.indexOf(b.provider);
    if (ia !== ib) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    return a.priority - b.priority;
  });
}

export async function decryptCredential(cred: UserCredential): Promise<string | null> {
  try {
    return await decryptSecret(cred.encrypted_key);
  } catch (e) {
    console.warn("[byok] decrypt failed:", (e as Error).message);
    return null;
  }
}

export async function markSuccess(cred: UserCredential): Promise<void> {
  await rest(`user_provider_credentials?id=eq.${cred.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      last_used_at: new Date().toISOString(),
      consecutive_failures: 0,
      disabled_until: null,
      validation_status: "connected",
      validation_message: null,
    }),
  });
}

/** Circuit breaker: back off this user's key without affecting anyone else. */
export async function markFailure(
  cred: UserCredential,
  err: ClassifiedError,
): Promise<void> {
  const failures = (cred.consecutive_failures ?? 0) + 1;
  const backoffMin = isAccountBlocked(err.kind)
    ? 30
    : Math.min(15, Math.max(1, failures * 2));
  const disabledUntil = failures >= 2 || isAccountBlocked(err.kind)
    ? new Date(Date.now() + backoffMin * 60_000).toISOString()
    : null;

  await rest(`user_provider_credentials?id=eq.${cred.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      consecutive_failures: failures,
      disabled_until: disabledUntil,
      validation_status: err.kind,
      validation_message: redact(err.message).slice(0, 300),
    }),
  });
}

export async function recordProviderEvent(input: {
  userId: string;
  provider: string;
  category: Category;
  model?: string | null;
  err: ClassifiedError;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
  correlationId?: string | null;
}): Promise<void> {
  // Collapse repeats: bump an open, matching event from the last hour.
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const existing = await rest<Array<{ id: string; occurrences: number }>>(
    `ai_provider_events?user_id=eq.${input.userId}&provider=eq.${input.provider}` +
      `&error_kind=eq.${input.err.kind}&dismissed=is.false&created_at=gte.${since}` +
      `&select=id,occurrences&order=created_at.desc&limit=1`,
  );

  if (existing?.[0]) {
    await rest(`ai_provider_events?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        occurrences: (existing[0].occurrences ?? 1) + 1,
        updated_at: new Date().toISOString(),
        fallback_provider: input.fallbackProvider ?? null,
        fallback_model: input.fallbackModel ?? null,
      }),
    });
    return;
  }

  await rest("ai_provider_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: input.userId,
      provider: input.provider,
      category: input.category,
      model: input.model ?? null,
      error_kind: input.err.kind,
      status: input.err.status,
      message: redact(input.err.message).slice(0, 500),
      fallback_provider: input.fallbackProvider ?? null,
      fallback_model: input.fallbackModel ?? null,
      correlation_id: input.correlationId ?? null,
    }),
  });
}

export async function recordUserUsage(input: {
  userId: string;
  provider: string;
  category: Category;
  model?: string | null;
  outcome: "success" | "error";
  inputTokens?: number;
  outputTokens?: number;
  reported?: boolean;
  latencyMs?: number;
}): Promise<void> {
  await rest("ai_usage_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: input.userId,
      provider: input.provider,
      category: input.category,
      model: input.model ?? null,
      outcome: input.outcome,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      reported: input.reported ?? false,
      latency_ms: input.latencyMs ?? null,
    }),
  });
}
