import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { UNAUTHORIZED } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import {
  getSafeAddressFromHost,
  UnsafeHostError,
} from "@sbfn/_shared/validateHostNotPrivate.ts";
import { z } from "zod";
import { acquirePastedFile } from "$/fileUrl/acquirePastedFile/acquirePastedFile.ts";
import { acquiredFileResponse } from "$/fileUrl/acquiredFileResponse.ts";
import { PrivateFileHostError } from "$/fileUrl/PrivateFileHostError.ts";
import type { FileUrlAPI } from "@sbfn/file-url/FileUrlRoutes.types.ts";

/**
 * Downloads a public link for the upload page. The caller must be signed in.
 * The link is not stored. Private and link-local hosts are refused before
 * any connection is opened.
 */
export const FileUrlRoutes = defineRoutes<FileUrlAPI>("file-url", {
  "/acquire": {
    POST: POST("/acquire")
      .bodySchema(
        z.object({
          url: z.string(),
          memberPath: z.string().optional(),
        }),
      )
      .action(async ({ body, user }) => {
        if (!user) {
          return new Response(JSON.stringify({ outcome: "error", reason: "not-public" }), {
            status: UNAUTHORIZED,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const acquired = await acquirePastedFile({
          url: body.url,
          memberPath: body.memberPath,
          fetch,
          assertPublicHost: _assertPublicHost,
        });
        return _withCors(acquiredFileResponse(acquired));
      }),
  },
});

async function _assertPublicHost(host: string): Promise<void> {
  try {
    await getSafeAddressFromHost(host);
  } catch (error) {
    if (error instanceof UnsafeHostError) {
      throw new PrivateFileHostError(host);
    }
    throw error;
  }
}

function _withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
