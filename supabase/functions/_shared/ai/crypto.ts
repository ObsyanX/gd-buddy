// AES-256-GCM encryption for user-supplied provider API keys.
// The key material lives only in the backend secret BYOK_ENCRYPTION_KEY and is
// never stored in the database. Plaintext keys exist only in memory for the
// duration of a single provider call.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("BYOK_ENCRYPTION_KEY");
  if (!secret) throw new Error("BYOK_ENCRYPTION_KEY is not configured");
  // Derive a stable 256-bit key from the secret.
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return await crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Returns `v1.<iv-b64>.<ciphertext-b64>`. */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(buf))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Malformed encrypted payload");
  }
  const key = await getKey();
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(parts[1]) },
    key,
    fromB64(parts[2]),
  );
  return dec.decode(buf);
}

/** Last 4 characters of a key, for display. Never reveals the key. */
export function maskTail(apiKey: string): string {
  const t = apiKey.trim();
  return t.length <= 4 ? "****" : t.slice(-4);
}

/** Strip anything that looks like a credential out of log/error text. */
export function redact(text: string): string {
  return (text || "")
    .replace(/\b(sk|gsk|xai|pk|api|key)[-_][A-Za-z0-9_\-]{8,}/gi, "[redacted]")
    .replace(/\b[A-Za-z0-9_\-]{32,}\b/g, "[redacted]");
}
