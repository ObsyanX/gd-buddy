// Routes an AI request through the signed-in user's own provider keys before
// any platform key is considered. Never switches silently: the response always
// carries the provider and model that actually served it, and every failure is
// recorded as a per-provider event the settings page shows.

import { ADAPTERS, type Category } from "./adapters.ts";
import { classifyStatus, classifyThrown, type ClassifiedError } from "./errors.ts";
import {
  decryptCredential,
  loadCredentials,
  loadPrefs,
  markFailure,
  markSuccess,
  recordProviderEvent,
  recordUserUsage,
  type UserCredential,
  type UserPrefs,
} from "./credentials.ts";

export interface RoutedText {
  json: Record<string, unknown>;
  provider: string;
  model: string;
}

export interface UserRouteResult {
  /** Present when one of the user's own providers served the request. */
  response?: RoutedText;
  /** Whether the platform chain may be used after user providers failed. */
  platformFallback: boolean;
  /** Set when the user has keys and every one of them failed. */
  lastError?: ClassifiedError;
  attempted: string[];
}

async function attemptText(
  cred: UserCredential,
  key: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; json: Record<string, unknown>; model: string } | { ok: false; err: ClassifiedError }> {
  const adapter = ADAPTERS[cred.provider];
  if (!adapter?.chatUrl) {
    return { ok: false, err: { kind: "unsupported_model", status: 0, message: "Provider cannot serve text", retryable: false } };
  }
  const model = cred.model || adapter.models[0];
  try {
    const res = await fetch(adapter.chatUrl, {
      method: "POST",
      headers: adapter.headers(key),
      body: JSON.stringify({ ...body, model }),
    });
    if (!res.ok) {
      return { ok: false, err: classifyStatus(res.status, await res.text(), res.headers) };
    }
    return { ok: true, json: (await res.json()) as Record<string, unknown>, model };
  } catch (e) {
    return { ok: false, err: classifyThrown(e) };
  }
}

/**
 * Try the user's own text providers in their configured order.
 * Returns whether the platform chain is still permitted afterwards.
 */
export async function routeUserText(
  userId: string,
  body: Record<string, unknown>,
): Promise<UserRouteResult> {
  let prefs: UserPrefs;
  try {
    prefs = await loadPrefs(userId);
  } catch {
    return { platformFallback: true, attempted: [] };
  }

  const creds = await loadCredentials(userId, "text", prefs);
  if (!creds.length) return { platformFallback: true, attempted: [] };

  const attempted: string[] = [];
  let lastError: ClassifiedError | undefined;

  for (const cred of creds) {
    const key = await decryptCredential(cred);
    if (!key) continue;
    attempted.push(cred.provider);
    const started = Date.now();
    const out = await attemptText(cred, key, body);

    if (out.ok) {
      const usage = (out.json.usage ?? {}) as Record<string, number>;
      await Promise.all([
        markSuccess(cred),
        recordUserUsage({
          userId,
          provider: cred.provider,
          category: "text",
          model: out.model,
          outcome: "success",
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0,
          reported: true,
          latencyMs: Date.now() - started,
        }),
      ]);
      return {
        response: { json: out.json, provider: cred.provider, model: out.model },
        platformFallback: prefs.platform_fallback,
        attempted,
      };
    }

    lastError = out.err;
    await Promise.all([
      markFailure(cred, out.err),
      recordProviderEvent({
        userId,
        provider: cred.provider,
        category: "text",
        model: cred.model,
        err: out.err,
      }),
      recordUserUsage({
        userId,
        provider: cred.provider,
        category: "text",
        model: cred.model,
        outcome: "error",
        latencyMs: Date.now() - started,
      }),
    ]);
    // Safety refusals are never routed around.
    if (out.err.kind === "safety_refusal") {
      return { platformFallback: false, lastError: out.err, attempted };
    }
  }

  return { platformFallback: prefs.platform_fallback, lastError, attempted };
}

/**
 * Fetch a usable personal key for a non-text category (voice / stt / vision).
 * Returns the decrypted key plus the credential so the caller can record the
 * outcome. Callers must call `noteKeyOutcome` afterwards.
 */
export async function getUserKeys(
  userId: string,
  category: Category,
): Promise<{ cred: UserCredential; key: string; model: string }[]> {
  const prefs = await loadPrefs(userId).catch(() => null);
  if (!prefs) return [];
  const creds = await loadCredentials(userId, category, prefs);
  const out: { cred: UserCredential; key: string; model: string }[] = [];
  for (const cred of creds) {
    const key = await decryptCredential(cred);
    if (key) out.push({ cred, key, model: cred.model || ADAPTERS[cred.provider]?.models[0] || "" });
  }
  return out;
}

export async function platformFallbackAllowed(userId: string): Promise<boolean> {
  const prefs = await loadPrefs(userId).catch(() => null);
  return prefs ? prefs.platform_fallback : true;
}

export async function noteKeyOutcome(
  userId: string,
  cred: UserCredential,
  category: Category,
  err: ClassifiedError | null,
): Promise<void> {
  if (!err) {
    await Promise.all([
      markSuccess(cred),
      recordUserUsage({ userId, provider: cred.provider, category, model: cred.model, outcome: "success" }),
    ]);
    return;
  }
  await Promise.all([
    markFailure(cred, err),
    recordProviderEvent({ userId, provider: cred.provider, category, model: cred.model, err }),
    recordUserUsage({ userId, provider: cred.provider, category, model: cred.model, outcome: "error" }),
  ]);
}
