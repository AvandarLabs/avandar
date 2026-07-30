import { createModule } from "@modules";
import { APIClient } from "@/clients/APIClient";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Client side of the privacy consent ack-token protocol. This module is
 * the browser counterpart to `supabase/functions/_shared/privacy/ackToken.ts`
 * (the Deno edge verifier): the frontend uses it to prove to the backend
 * that the user saw and approved a specific payload before any private
 * data is forwarded to the LLM. It does two jobs:
 *
 *   1. Caches the per-workspace HMAC session secret. The secret is fetched
 *      from `GET /chat/:workspaceId/session-secret` on first use, decoded
 *      from base64, and held in memory as a `CryptoKey`. Never persisted:
 *      a localStorage / IDB write would let an XSS exfiltrate it.
 *   2. Issues signed ack tokens (`issueAckToken`) and hashes payloads
 *      (`hashTextPayload`) using that key. These must compute byte-for-byte
 *      the same values as the server, or verification fails; the
 *      `ackTokenRoundtrip.test.ts` guards that the two implementations stay
 *      in lockstep.
 *
 * On logout / workspace switch, callers should invoke `clearAll()`
 * (we cannot eagerly invalidate from here without coupling to auth).
 */

type CachedSecret = {
  key: CryptoKey;
  /** Wall-clock ms when the secret was issued by the server. */
  issuedAt: number;
};

const CACHE = new Map<Workspace.Id, Promise<CachedSecret>>();

const TEXT_ENCODER = new TextEncoder();

async function _fetchAndImport(
  workspaceId: Workspace.Id,
): Promise<CachedSecret> {
  const response = await APIClient.get({
    route: "chat/:workspaceId/session-secret",
    pathParams: { workspaceId },
  });
  const bytes = _base64Decode(response.sessionSecret);
  // Re-pack into a fresh ArrayBuffer (not SharedArrayBuffer-backed) so
  // strict-mode TS recognises it as `BufferSource` for `importKey`.
  const bytesBuf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(bytesBuf).set(bytes);
  const key = await crypto.subtle.importKey(
    "raw",
    bytesBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return { key, issuedAt: response.issuedAt };
}

function _getSessionSecret(workspaceId: Workspace.Id): Promise<CachedSecret> {
  const cached = CACHE.get(workspaceId);
  if (cached) {
    return cached;
  }
  const promise = _fetchAndImport(workspaceId).catch((err) => {
    CACHE.delete(workspaceId);
    throw err;
  });
  CACHE.set(workspaceId, promise);
  return promise;
}

export const SessionSecret = createModule("SessionSecret", {
  builder: () => {
    return {
      getSessionSecret: (workspaceId: Workspace.Id): Promise<CachedSecret> => {
        return _getSessionSecret(workspaceId);
      },

      clearAll: (): void => {
        CACHE.clear();
      },

      // Hash a UTF-8 string with SHA-256 and return the lowercase hex digest.
      // Mirrors the server's `hashTextPayload` so both sides compute the same
      // `payloadHash` for the ack header.
      hashTextPayload: async (text: string): Promise<string> => {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          TEXT_ENCODER.encode(text),
        );
        return _toHex(new Uint8Array(digest));
      },

      // Issue a signed ack token. Header is base64url-encoded JSON; signature
      // is hex-encoded HMAC-SHA256 over the encoded header. The two are joined
      // by a `.`.
      issueAckToken: async (args: {
        workspaceId: Workspace.Id;
        userId: string;
        payloadHash: string;
      }): Promise<string> => {
        const { key } = await _getSessionSecret(args.workspaceId);

        const now = Date.now();
        const header = {
          nonce: crypto.randomUUID(),
          workspaceId: args.workspaceId,
          userId: args.userId,
          issuedAt: now,
          expiresAt: now + 5 * 60 * 1000,
          payloadHash: args.payloadHash,
        };
        const headerJson = JSON.stringify(header);
        const headerB64 = _base64UrlEncode(TEXT_ENCODER.encode(headerJson));
        const sigBuf = await crypto.subtle.sign(
          "HMAC",
          key,
          TEXT_ENCODER.encode(headerB64),
        );
        const sigHex = _toHex(new Uint8Array(sigBuf));
        return `${headerB64}.${sigHex}`;
      },
    };
  },
});

function _base64Decode(input: string): Uint8Array {
  const bin = atob(input);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
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

function _toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}
