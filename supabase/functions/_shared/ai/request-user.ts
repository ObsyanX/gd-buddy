// Request-scoped caller identity so shared AI code can use the signed-in
// user's own keys without every function passing the user id explicitly.
// Wraps Deno.serve once at import time; the JWT is verified before use.
import { AsyncLocalStorage } from "node:async_hooks";
import { createClient } from "npm:@supabase/supabase-js@2";

const store = new AsyncLocalStorage<{ auth: string | null }>();
let installed = false;

export function installRequestContext(): void {
  if (installed) return;
  installed = true;
  try {
    // deno-lint-ignore no-explicit-any
    const D = Deno as any;
    const orig = D.serve.bind(Deno);
    // deno-lint-ignore no-explicit-any
    const wrap = (h: any) => (req: Request, info: unknown) =>
      store.run({ auth: req.headers.get("Authorization") }, () => h(req, info));
    // deno-lint-ignore no-explicit-any
    D.serve = (...args: any[]) => {
      const a = args.map((x) => (typeof x === "function" ? wrap(x) : x));
      if (a.length === 1 && a[0] && typeof a[0] === "object" && typeof a[0].handler === "function") {
        a[0] = { ...a[0], handler: wrap(a[0].handler) };
      }
      return orig(...a);
    };
  } catch (e) {
    console.warn("[byok] request context unavailable:", (e as Error).message);
  }
}

const cache = new Map<string, { uid: string | null; exp: number }>();

/** Verified user id of the current request, or null (service calls, anon). */
export async function currentUserId(): Promise<string | null> {
  const auth = store.getStore()?.auth;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.uid;
  let uid: string | null = null;
  try {
    const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data } = await c.auth.getClaims(token);
    const claims = data?.claims as Record<string, unknown> | undefined;
    if (claims?.sub && claims.role === "authenticated") uid = claims.sub as string;
  } catch { uid = null; }
  if (cache.size > 500) cache.clear();
  cache.set(token, { uid, exp: Date.now() + 5 * 60_000 });
  return uid;
}
