import { createModule } from "@modules";
import { APIClient } from "@/clients/APIClient";
import type { Workspace } from "$/models/Workspace/Workspace";
import {
  base64UrlEncode,
  hashTextPayload,
  toHex,
} from "$/utils/privacy/sessionSecretUtils";

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

/**
 * Client side of the privacy consent ack-token protocol, and the browser
 * counterpart to `supabase/functions/_shared/privacy/ackToken.ts` (the Deno
 * edge verifier). The frontend uses it to prove to the backend that the user
 * saw and approved a specific payload before any private data is forwarded to
 * the LLM. It does two jobs: (1) caches the per-workspace HMAC session secret
 * fetched from `GET /chat/:workspaceId/session-secret`, held only in memory as
 * a `CryptoKey` (never persisted, so an XSS cannot exfiltrate it), and
 * (2) issues signed ack tokens (`issueAckToken`) and hashes payloads
 * (`hashTextPayload`) with that key. The hashing/encoding must match the server
 * byte-for-byte (shared via `sessionSecretUtils`; guarded by
 * `ackTokenRoundtrip.test.ts`). Call `clearAll()` on logout / workspace switch.
 */
export const SessionSecret = createModule("SessionSecret", {
  builder: () => {
    return {
      getSessionSecret: (workspaceId: Workspace.Id): Promise<CachedSecret> => {
        return _getSessionSecret(workspaceId);
      },

      clearAll: (): void => {
        CACHE.clear();
      },

      // Re-exposes the shared `hashTextPayload` (from `sessionSecretUtils`) so
      // this module stays the single client entry point for the `payloadHash`.
      hashTextPayload,

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
        const headerB64 = base64UrlEncode(TEXT_ENCODER.encode(headerJson));
        const sigBuf = await crypto.subtle.sign(
          "HMAC",
          key,
          TEXT_ENCODER.encode(headerB64),
        );
        const sigHex = toHex(new Uint8Array(sigBuf));
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
