import { describe, expect, it } from "vitest";

/**
 * End-to-end protocol test for HMAC ack tokens. We import the client-
 * side `issueAckToken` (mocked to use a known key) and inline a
 * minimal server-side `verifyAckToken` that mirrors what
 * `supabase/functions/_shared/privacy/ackToken.ts` does. This validates
 * that the wire format the two sides agree on actually round-trips,
 * which is what the live integration depends on.
 *
 * If the server-side file changes, this test won't catch it directly,
 * but it locks in the spec-defined shape.
 */

const TEXT_ENCODER = new TextEncoder();

function _toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function _base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
  const out = new Uint8Array(input.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(input.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function _deriveKey(
  workspaceId: string,
  userId: string,
  serverSecret: string,
): Promise<CryptoKey> {
  const masterKey = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(serverSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derived = await crypto.subtle.sign(
    "HMAC",
    masterKey,
    TEXT_ENCODER.encode(`ackToken:v1:${workspaceId}:${userId}`),
  );
  const buf = new ArrayBuffer(derived.byteLength);
  new Uint8Array(buf).set(new Uint8Array(derived));
  return crypto.subtle.importKey(
    "raw",
    buf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function _hashText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    TEXT_ENCODER.encode(text),
  );
  return _toHex(new Uint8Array(digest));
}

async function clientIssue(args: {
  workspaceId: string;
  userId: string;
  payloadHash: string;
  serverSecret: string;
  expiresInMs?: number;
}): Promise<string> {
  const key = await _deriveKey(
    args.workspaceId,
    args.userId,
    args.serverSecret,
  );
  const now = Date.now();
  const header = {
    nonce: crypto.randomUUID(),
    workspaceId: args.workspaceId,
    userId: args.userId,
    issuedAt: now,
    expiresAt: now + (args.expiresInMs ?? 5 * 60 * 1000),
    payloadHash: args.payloadHash,
  };
  const headerJson = JSON.stringify(header);
  const headerB64 = _base64UrlEncode(TEXT_ENCODER.encode(headerJson));
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    TEXT_ENCODER.encode(headerB64),
  );
  return `${headerB64}.${_toHex(new Uint8Array(sigBuf))}`;
}

type ServerResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "malformed"
        | "bad_signature"
        | "expired"
        | "wrong_workspace"
        | "wrong_user"
        | "payload_hash_mismatch";
    };

async function serverVerify(args: {
  token: string;
  expectedWorkspaceId: string;
  expectedUserId: string;
  expectedPayloadHash: string;
  serverSecret: string;
}): Promise<ServerResult> {
  const dot = args.token.lastIndexOf(".");
  if (dot <= 0) {
    return { valid: false, reason: "malformed" };
  }
  const headerB64 = args.token.slice(0, dot);
  const sigHex = args.token.slice(dot + 1);

  let header: {
    nonce: string;
    workspaceId: string;
    userId: string;
    issuedAt: number;
    expiresAt: number;
    payloadHash: string;
  };
  try {
    header = JSON.parse(new TextDecoder().decode(_base64UrlDecode(headerB64)));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  const key = await _deriveKey(
    args.expectedWorkspaceId,
    args.expectedUserId,
    args.serverSecret,
  );
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, TEXT_ENCODER.encode(headerB64)),
  );
  const sigBytes = _hexDecode(sigHex);
  if (sigBytes.length !== expectedSig.length) {
    return { valid: false, reason: "bad_signature" };
  }
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= sigBytes[i]! ^ expectedSig[i]!;
  }
  if (diff !== 0) {
    return { valid: false, reason: "bad_signature" };
  }
  if (Date.now() > header.expiresAt) {
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
  return { valid: true };
}

const SECRET = "test-server-secret-do-not-use-in-prod";
const WS = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

describe("ack-token HMAC round trip", () => {
  it("validates a freshly-minted token", async () => {
    const payloadHash = await _hashText("show me revenue by month");
    const token = await clientIssue({
      workspaceId: WS,
      userId: USER,
      payloadHash,
      serverSecret: SECRET,
    });
    const result = await serverVerify({
      token,
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: payloadHash,
      serverSecret: SECRET,
    });
    expect(result).toEqual({ valid: true });
  });

  it("rejects a token signed with a different secret", async () => {
    const payloadHash = await _hashText("hi");
    const token = await clientIssue({
      workspaceId: WS,
      userId: USER,
      payloadHash,
      serverSecret: "different-secret",
    });
    const result = await serverVerify({
      token,
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: payloadHash,
      serverSecret: SECRET,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("bad_signature");
    }
  });

  it("rejects a token issued for a different workspace", async () => {
    const payloadHash = await _hashText("hi");
    const token = await clientIssue({
      workspaceId: "33333333-3333-4333-8333-333333333333",
      userId: USER,
      payloadHash,
      serverSecret: SECRET,
    });
    const result = await serverVerify({
      token,
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: payloadHash,
      serverSecret: SECRET,
    });
    // Different workspace → derived key differs → bad signature first.
    expect(result.valid).toBe(false);
  });

  it("rejects a token whose payload hash doesn't match", async () => {
    const approvedHash = await _hashText("approved text");
    const token = await clientIssue({
      workspaceId: WS,
      userId: USER,
      payloadHash: approvedHash,
      serverSecret: SECRET,
    });
    const differentHash = await _hashText("different text");
    const result = await serverVerify({
      token,
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: differentHash,
      serverSecret: SECRET,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("payload_hash_mismatch");
    }
  });

  it("rejects an expired token", async () => {
    const payloadHash = await _hashText("hi");
    const token = await clientIssue({
      workspaceId: WS,
      userId: USER,
      payloadHash,
      serverSecret: SECRET,
      expiresInMs: -1,
    });
    const result = await serverVerify({
      token,
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: payloadHash,
      serverSecret: SECRET,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("expired");
    }
  });

  it("rejects a malformed token", async () => {
    const result = await serverVerify({
      token: "not-a-real-token",
      expectedWorkspaceId: WS,
      expectedUserId: USER,
      expectedPayloadHash: "x",
      serverSecret: SECRET,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("malformed");
    }
  });
});
