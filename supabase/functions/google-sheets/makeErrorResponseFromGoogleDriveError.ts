import { corsHeaders } from "@sbfn/_shared/cors.ts";
import {
  BAD_GATEWAY,
  CONFLICT,
  NOT_FOUND,
  PAYLOAD_TOO_LARGE,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "@sbfn/_shared/httpCodes.ts";
import type {
  GoogleDriveError,
  GoogleDriveErrorCode,
} from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError.ts";

const HTTP_STATUS_BY_CODE: Record<GoogleDriveErrorCode, number> = {
  "drive-api-not-configured": BAD_GATEWAY,
  "export-too-large": PAYLOAD_TOO_LARGE,
  "file-not-accessible": NOT_FOUND,
  "sheet-not-found": NOT_FOUND,
  "google-auth-expired": UNAUTHORIZED,
  "owner-reconnect-required": CONFLICT,
  "rate-limited": TOO_MANY_REQUESTS,
  unknown: BAD_GATEWAY,
};

/**
 * Answers a failed sheet read with `{ error: { code, message, reason } }`,
 * where `code` is the `GoogleDriveErrorCode` the browser already turns into
 * copy.
 */
export function makeErrorResponseFromGoogleDriveError(
  error: GoogleDriveError,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        reason: error.reason,
      },
    }),
    {
      status: HTTP_STATUS_BY_CODE[error.code],
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
