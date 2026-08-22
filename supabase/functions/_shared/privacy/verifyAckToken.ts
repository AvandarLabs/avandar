import { deriveSessionSecret } from "@sbfn/_shared/privacy/deriveSessionSecret.ts";

import { base64UrlDecode } from "$/utils/privacy/sessionSecretUtils.ts";

/**
 * Header fields signed into a privacy consent acknowledgement token.
 * A nonce is a unique value intended to be used once, which lets the server
 * reject a replayed token during its short validity window.
 */
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
 * deployment we ship today limits replay detection to duplicate requests
 * that land on the same edge worker within the token window.
 */
const SEEN_NONCES = new Map<string, number>();
const NONCE_CACHE_TTL_MS = 10 * 60 * 1000;
const TEXT_ENCODER = new TextEncoder();

function _gcNonces(): void {
  const now = Date.now();
  SEEN_NONCES.forEach((seenAt, nonce) => {
    if (now - seenAt > NONCE_CACHE_TTL_MS) {
      SEEN_NONCES.delete(nonce);
    }
  });
}

function _hexDecode(input: string): Uint8Array {
  if (input.length % 2 !== 0) {
    throw new Error("hex string must have even length");
  }
  const output = new Uint8Array(input.length / 2);
  output.forEach((_, index) => {
    output[index] = parseInt(input.slice(index * 2, index * 2 + 2), 16);
  });
  return output;
}

function _timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  a.forEach((value, index) => {
    difference |= value ^ b[index]!;
  });
  return difference === 0;
}

/**
 * Verifies an ack token against the authenticated workspace, user, and
 * approved payload hash. Returns a discriminated union for failure handling.
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
    const headerBytes = base64UrlDecode(headerB64);
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
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(headerB64)),
  );

  let signature: Uint8Array;
  try {
    signature = _hexDecode(signatureHex);
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (!_timingSafeEqual(signature, expectedSignature)) {
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
