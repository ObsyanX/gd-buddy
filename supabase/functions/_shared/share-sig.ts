// HMAC-SHA256 signing/verification for share attribution refs.
// A signature binds (kind, ref) so a share URL can't be spoofed to
// attribute installs or joins to an arbitrary user or session.

const SECRET = Deno.env.get("SHARE_REF_SIGNING_SECRET") ?? "";

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(msg: string): Promise<string> {
  if (!SECRET) throw new Error("SHARE_REF_SIGNING_SECRET missing");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg),
  );
  return b64url(new Uint8Array(sig));
}

/** Compact signature — first 22 chars of the base64url-encoded HMAC (~130 bits). */
export async function signShareRef(kind: string, ref: string): Promise<string> {
  const full = await hmac(`${kind}:${ref}`);
  return full.slice(0, 22);
}

export async function verifyShareRef(
  kind: string,
  ref: string,
  sig: string | null | undefined,
): Promise<boolean> {
  if (!sig || sig.length < 8) return false;
  try {
    const expected = await signShareRef(kind, ref);
    // Constant-time-ish compare
    if (expected.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}
