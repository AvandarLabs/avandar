import { GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { deriveSessionSecret } from "@sbfn/_shared/privacy/deriveSessionSecret.ts";
import { z } from "zod";
import type { ChatSessionSecretResponse } from "$/types/chat.types.ts";

function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Returns the secret used to sign acknowledgements for flagged chat payloads,
 * including PII, bias, and medical-data consent before LLM transfer.
 */
export const GetChatSessionSecret = GET({
  path: "/:workspaceId/session-secret",
  schema: { workspaceId: z.uuid() },
}).action(async ({ pathParams, user }): Promise<ChatSessionSecretResponse> => {
  const { workspaceId } = pathParams;
  const secret = await deriveSessionSecret({
    workspaceId,
    userId: user.id,
  });
  return {
    sessionSecret: _arrayBufferToBase64(secret),
    issuedAt: Date.now(),
  };
});
