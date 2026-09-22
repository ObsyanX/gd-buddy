// Classification of provider failures. Drives retry policy, circuit breaking
// and the per-card notifications in the BYOK settings page.

export type ErrorKind =
  | "invalid_key"
  | "quota_exhausted"
  | "rate_limited"
  | "server_error"
  | "timeout"
  | "network"
  | "unsupported_model"
  | "bad_request"
  | "permission"
  | "missing_credentials"
  | "bad_audio"
  | "safety_refusal"
  | "unknown";

export interface ClassifiedError {
  kind: ErrorKind;
  status: number;
  message: string;
  /** Transient errors may be retried on the same provider. */
  retryable: boolean;
  /** Seconds to wait before retrying, when the provider told us. */
  retryAfter?: number;
}

export function classifyStatus(
  status: number,
  body: string,
  headers?: Headers,
): ClassifiedError {
  const text = (body || "").toLowerCase();
  const retryAfterRaw = headers?.get("retry-after");
  const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;

  let kind: ErrorKind = "unknown";

  if (/safety|content[_ ]policy|blocked by|refus/i.test(text) && status < 500) {
    kind = "safety_refusal";
  } else if (status === 401) kind = "invalid_key";
  else if (status === 402 || /insufficient|quota_exceeded|no credits|0 credits|billing/.test(text)) {
    kind = "quota_exhausted";
  } else if (status === 429) {
    kind = /quota|billing|insufficient/.test(text) ? "quota_exhausted" : "rate_limited";
  } else if (status === 403) kind = "permission";
  else if (status === 404 || /model_not_found|does not exist|decommissioned|unknown model/.test(text)) {
    kind = "unsupported_model";
  } else if (/invalid audio|unsupported audio|could not decode/.test(text)) {
    kind = "bad_audio";
  } else if (status >= 500) kind = "server_error";
  else if (status >= 400) kind = "bad_request";

  const retryable = kind === "rate_limited" || kind === "server_error" ||
    kind === "timeout" || kind === "network";

  return {
    kind,
    status,
    message: (body || `HTTP ${status}`).slice(0, 500),
    retryable,
    retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
  };
}

export function classifyThrown(e: unknown): ClassifiedError {
  const msg = e instanceof Error ? e.message : String(e);
  const kind: ErrorKind = /timeout|timed out|deadline/i.test(msg) ? "timeout" : "network";
  return { kind, status: 0, message: msg.slice(0, 500), retryable: true };
}

/** Account-level problems apply to every model on that provider. */
export function isAccountBlocked(kind: ErrorKind): boolean {
  return kind === "invalid_key" || kind === "quota_exhausted" || kind === "permission";
}

export const ERROR_LABELS: Record<ErrorKind, string> = {
  invalid_key: "Invalid key",
  quota_exhausted: "Quota exhausted",
  rate_limited: "Rate limited",
  server_error: "Provider server error",
  timeout: "Timed out",
  network: "Network error",
  unsupported_model: "Unsupported model",
  bad_request: "Bad request",
  permission: "Permission denied",
  missing_credentials: "No key configured",
  bad_audio: "Audio could not be processed",
  safety_refusal: "Blocked by provider safety policy",
  unknown: "Unavailable",
};
