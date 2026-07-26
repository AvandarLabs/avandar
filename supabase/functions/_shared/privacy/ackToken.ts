/**
 * Server-side helpers for the ack-token protocol described in
 * `docs/superpowers/specs/2026-05-19-chat-interactive-workflows-design.md`.
 *
 *   ackToken = base64url(headerJson) + '.' + hex(HMAC-SHA256(headerJson, K))
 *
 * where `K` is a session secret derived per (workspace, user) pair from
 * `SB_SECRET_KEY`. The client and server both derive `K` independently
 * via `deriveSessionSecret(workspaceId, userId)`: no secret material
 * ever has to round-trip on the wire.
 *
 * The header carries:
 *
 *   - `nonce`        : UUID, single-use within the token's TTL
 *   - `workspaceId`  : must match the route's `workspaceId`
 *   - `userId`       : must match the authenticated user
 *   - `issuedAt`     : wall-clock ms
 *   - `expiresAt`    : `issuedAt + 5 * 60 * 1000`
 *   - `payloadHash`  : SHA-256 hex of the canonicalised approved payload
 *
 * The backend rejects:
 *   - bad signature
 *   - expired tokens
 *   - mismatched workspaceId / userId
 *   - mismatched payloadHash (i.e. the values in the body don't match
 *     what was approved client-side)
 *   - duplicate nonces (replayed tokens): best-effort, see notes.
 */

const SB_SECRET_KEY = Deno.env.get("SB_SECRET_KEY");

if (!SB_SECRET_KEY) {
  throw new Error(
    "SB_SECRET_KEY is required to derive ack-token session secrets",
  );
}

const TEXT_ENCODER = new TextEncoder();

/**
 * Derives a per-(workspace, user) HMAC key from the global server secret.
 * Used both for issuing ack tokens (on the server's `session-secret`
 * endpoint, which exposes the derived key to the client) and for
 * verifying them on chat requests.
 */
export async function deriveSessionSecret(args: {
  workspaceId: string;
  userId: string;
}): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(SB_SECRET_KEY!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = TEXT_ENCODER.encode(
    `ackToken:v1:${args.workspaceId}:${args.userId}`,
  );
  return crypto.subtle.sign("HMAC", key, message);
}

export type AckHeader = {
  nonce: string;
  workspaceId: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  payloadHash: string;
};

export type VerifyAckTokenResult =
  | { valid: true; header: AckHeader }
  | {
      valid: false;
      reason:
        | "malformed"
        | "bad_signature"
        | "expired"
        | "wrong_workspace"
        | "wrong_user"
        | "payload_hash_mismatch"
        | "nonce_replay";
    };

/**
 * Module-scope set of seen nonces. In a multi-instance deployment this
 * needs to move to Redis / Supabase. The single-instance edge function
 * deployment we ship today is good enough for v1: replay attacks would
 * have to land on the same edge worker within the 5-minute window.
 */
const SEEN_NONCES = new Map<string, number>();
const NONCE_CACHE_TTL_MS = 10 * 60 * 1000;

function _gcNonces(): void {
  const now = Date.now();
  for (const [nonce, seenAt] of SEEN_NONCES) {
    if (now - seenAt > NONCE_CACHE_TTL_MS) {
      SEEN_NONCES.delete(nonce);
    }
  }
}

function _base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function _hexDecode(input: string): Uint8Array {
  if (input.length % 2 !== 0) {
    throw new Error("hex string must have even length");
  }
  const out = new Uint8Array(input.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(input.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function _timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

/**
 * Verifies an ack token against the expected (workspaceId, userId,
 * payloadHash). Returns a discriminated union so the caller can decide
 * how to surface the specific failure mode.
 */
export async function verifyAckToken(args: {
  token: string;
  expectedWorkspaceId: string;
  expectedUserId: string;
  expectedPayloadHash: string;
}): Promise<VerifyAckTokenResult> {
  const dot = args.token.lastIndexOf(".");
  if (dot <= 0 || dot >= args.token.length - 1) {
    return { valid: false, reason: "malformed" };
  }
  const headerB64 = args.token.slice(0, dot);
  const signatureHex = args.token.slice(dot + 1);

  let header: AckHeader;
  try {
    const headerBytes = _base64UrlDecode(headerB64);
    header = JSON.parse(new TextDecoder().decode(headerBytes)) as AckHeader;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (
    typeof header.nonce !== "string" ||
    typeof header.workspaceId !== "string" ||
    typeof header.userId !== "string" ||
    typeof header.issuedAt !== "number" ||
    typeof header.expiresAt !== "number" ||
    typeof header.payloadHash !== "string"
  ) {
    return { valid: false, reason: "malformed" };
  }

  const secret = await deriveSessionSecret({
    workspaceId: args.expectedWorkspaceId,
    userId: args.expectedUserId,
  });

  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(headerB64)),
  );

  let signature: Uint8Array;
  try {
    signature = _hexDecode(signatureHex);
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (!_timingSafeEqual(signature, expectedSig)) {
    return { valid: false, reason: "bad_signature" };
  }

  const now = Date.now();
  if (now > header.expiresAt) {
    return { valid: false, reason: "expired" };
  }

  if (header.workspaceId !== args.expectedWorkspaceId) {
    return { valid: false, reason: "wrong_workspace" };
  }
  if (header.userId !== args.expectedUserId) {
    return { valid: false, reason: "wrong_user" };
  }
  if (header.payloadHash !== args.expectedPayloadHash) {
    return { valid: false, reason: "payload_hash_mismatch" };
  }

  _gcNonces();
  if (SEEN_NONCES.has(header.nonce)) {
    return { valid: false, reason: "nonce_replay" };
  }
  SEEN_NONCES.set(header.nonce, now);

  return { valid: true, header };
}

/**
 * Canonicalise + hash a payload for inclusion in the ack header. The
 * client and server must agree on the canonical form; the cheapest
 * agreement is "JSON.stringify of a sorted-keys version of the
 * payload". For text-shaped payloads (user message), we hash the raw
 * UTF-8 bytes directly.
 */
export async function hashTextPayload(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    TEXT_ENCODER.encode(text),
  );
  return _toHex(new Uint8Array(digest));
}

function _toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}
