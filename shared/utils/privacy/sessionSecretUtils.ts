import { base64ToUint8, uint8ToBase64 } from "@utils/encoding/index.ts";

const TEXT_ENCODER = new TextEncoder();

/** Lowercase hex encoding of a byte array (two chars per byte). */
export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Encodes bytes as unpadded base64url (`+`/`/` become `-`/`_`, trailing `=`
 * stripped). Used to encode the ack-token header on the issuing (client) side.
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  return uint8ToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes an unpadded base64url string back into bytes, restoring `+`/`/` and
 * re-adding the `=` padding `atob` requires. Inverse of `base64UrlEncode`, used
 * to read the ack-token header on the verifying (server) side.
 */
export function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return base64ToUint8(b64);
}

/**
 * SHA-256 hashes a UTF-8 string and returns the lowercase hex digest. The
 * client and server both call this to derive the ack header's `payloadHash`,
 * so they must compute it identically (guarded by `ackTokenRoundtrip.test.ts`).
 */
export async function hashTextPayload(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    TEXT_ENCODER.encode(text),
  );
  return toHex(new Uint8Array(digest));
}
