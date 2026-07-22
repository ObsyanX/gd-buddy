// Shared auth + session-authorization helper for edge functions.
//
// These helpers centralize:
//   - JWT validation via supabase.auth.getClaims()
//   - session ownership/participation check via the public.can_access_session
//     SQL helper
//   - admin role check via public.has_role
//
// All pipeline/analytics functions call requireSessionAccess() before touching
// session-scoped data with the service role client.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuthContext {
  userId: string;
  isAdmin: boolean;
  jwt: string;
}

function unauthorized(msg = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(msg = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

/**
 * Validate the request JWT. Returns AuthContext or a Response that the caller
 * should return verbatim.
 */
export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return unauthorized();
  const jwt = authHeader.slice("Bearer ".length);

  // Allow trusted service-role calls (edge-function to edge-function) to skip
  // the user JWT flow. Returned isAdmin=true so downstream role checks pass.
  if (jwt === SERVICE_ROLE) {
    return { userId: "service", isAdmin: true, jwt };
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getClaims(jwt);
  const userId = data?.claims?.sub as string | undefined;
  if (error || !userId) return unauthorized();

  const admin = serviceClient();
  const { data: isAdminData } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  return { userId, isAdmin: Boolean(isAdminData), jwt };
}

/**
 * Require a valid JWT AND that the caller can access the given session.
 * Admins always pass. Session access is verified against public.can_access_session.
 */
export async function requireSessionAccess(
  req: Request,
  sessionId: string,
): Promise<AuthContext | Response> {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (auth.isAdmin) return auth;

  const admin = serviceClient();
  const { data: canAccess, error } = await admin.rpc("can_access_session", {
    _session_id: sessionId,
    _user_id: auth.userId,
  });
  if (error || !canAccess) return forbidden("Not a participant of this session");
  return auth;
}

/**
 * Require the caller has one of the given roles (or is admin).
 */
export async function requireRole(
  req: Request,
  roles: string[],
): Promise<AuthContext | Response> {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (auth.isAdmin) return auth;

  const admin = serviceClient();
  for (const role of roles) {
    const { data } = await admin.rpc("has_role", {
      _user_id: auth.userId,
      _role: role,
    });
    if (data) return auth;
  }
  return forbidden("Insufficient role");
}
