import { supabase } from "@/integrations/supabase/client";

export type AuthErrorCode =
  | "popup_blocked"
  | "popup_closed"
  | "access_denied"
  | "network_timeout"
  | "unauthorized_domain"
  | "provider_disabled"
  | "invalid_credentials"
  | "email_taken"
  | "rate_limited"
  | "session_missing"
  | "unknown";

export interface MappedAuthError {
  code: AuthErrorCode;
  title: string;
  message: string;
  /** Whether a retry with the same intent is likely to succeed. */
  retryable: boolean;
}

/** Map any raw error/message into a consistent, user-friendly shape. */
export function mapAuthError(
  raw: unknown,
  provider: "google" | "apple" | "microsoft" | "email" = "email"
): MappedAuthError {
  const text = (
    (raw as any)?.message ??
    (typeof raw === "string" ? raw : "") ??
    ""
  ).toString();
  const lower = text.toLowerCase();

  const providerName =
    provider === "google" ? "Google" :
    provider === "apple" ? "Apple" :
    provider === "microsoft" ? "Microsoft" : "email";

  if (lower.includes("popup") && lower.includes("block")) {
    return {
      code: "popup_blocked",
      title: "Popup blocked",
      message: `Your browser blocked the ${providerName} sign-in window. Allow popups for this site and try again.`,
      retryable: true,
    };
  }
  if (
    (lower.includes("popup") && (lower.includes("close") || lower.includes("closed"))) ||
    lower.includes("user closed") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return {
      code: "popup_closed",
      title: "Sign-in cancelled",
      message: `You closed the ${providerName} window before finishing. Tap retry to continue.`,
      retryable: true,
    };
  }
  if (lower.includes("access_denied") || lower.includes("denied") || lower.includes("consent")) {
    return {
      code: "access_denied",
      title: "Permission denied",
      message: `You didn't grant the requested permissions. Approve the ${providerName} consent screen to continue.`,
      retryable: true,
    };
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("offline")
  ) {
    return {
      code: "network_timeout",
      title: "Network problem",
      message: "We couldn't reach the sign-in service. Check your connection and try again.",
      retryable: true,
    };
  }
  if (
    lower.includes("redirect") && lower.includes("uri") ||
    lower.includes("unauthorized") && lower.includes("domain") ||
    lower.includes("origin") && lower.includes("not allowed")
  ) {
    return {
      code: "unauthorized_domain",
      title: "Domain not authorized",
      message: "This domain isn't approved for sign-in yet. Please try again from the official site or contact support.",
      retryable: false,
    };
  }
  if (
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled") ||
    lower.includes("provider not enabled")
  ) {
    return {
      code: "provider_disabled",
      title: "Sign-in unavailable",
      message: `${providerName} sign-in isn't enabled yet. Please contact support.`,
      retryable: false,
    };
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return {
      code: "invalid_credentials",
      title: "Wrong email or password",
      message: "The email or password you entered is incorrect. Double-check and try again, or use \"Forgot\" to reset.",
      retryable: true,
    };
  }
  if (lower.includes("already registered") || lower.includes("user already")) {
    return {
      code: "email_taken",
      title: "Email already in use",
      message: "An account with this email exists. Try signing in instead.",
      retryable: false,
    };
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return {
      code: "rate_limited",
      title: "Too many attempts",
      message: "Please wait a moment before trying again.",
      retryable: true,
    };
  }
  if (lower.includes("session")) {
    return {
      code: "session_missing",
      title: "Session not established",
      message: "We couldn't confirm your session. Please try signing in again.",
      retryable: true,
    };
  }
  return {
    code: "unknown",
    title: `${providerName} sign-in failed`,
    message: text || "An unexpected error occurred. Please try again.",
    retryable: true,
  };
}

/** Fire-and-forget log to error_logs. Never throws, never blocks UI. */
export async function logAuthError(params: {
  provider: "google" | "apple" | "microsoft" | "email";
  code: AuthErrorCode;
  raw: unknown;
  context?: Record<string, unknown>;
}) {
  try {
    const message =
      (params.raw as any)?.message ??
      (typeof params.raw === "string" ? params.raw : JSON.stringify(params.raw ?? ""));
    const stack = (params.raw as any)?.stack ?? null;
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } as any }));

    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      error_message: String(message || "auth error").slice(0, 2000),
      error_stack: stack ? String(stack).slice(0, 4000) : null,
      error_source: `auth_${params.provider}`,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      metadata: {
        code: params.code,
        provider: params.provider,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        timestamp: new Date().toISOString(),
        ...(params.context ?? {}),
      },
    });
  } catch {
    // never surface logging failures
  }
}
