const SB_SECRET_KEY = Deno.env.get("SB_SECRET_KEY");

if (!SB_SECRET_KEY) {
  throw new Error(
    "SB_SECRET_KEY is required to derive ack-token session secrets",
  );
}

const TEXT_ENCODER = new TextEncoder();

/**
 * Derives the per-workspace/user HMAC key shared by the chat ack-token issuer
 * and verifier. The returned key material is only used inside the server or
 * returned by the authenticated session-secret endpoint.
 */
export async function deriveSessionSecret(args: {
  workspaceId: string;
  userId: string;
}): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(SB_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = TEXT_ENCODER.encode(
    `ackToken:v1:${args.workspaceId}:${args.userId}`,
  );
  return crypto.subtle.sign("HMAC", key, message);
}
