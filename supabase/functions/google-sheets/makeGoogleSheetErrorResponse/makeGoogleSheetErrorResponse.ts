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
 * copy. Google refusing the token is reported as `owner-reconnect-required`:
 * the token belongs to the account that added the sheet, so only its owner
 * can fix it, whoever is reading.
 */
export function makeGoogleSheetErrorResponse(
  error: GoogleDriveError,
): Response {
  const code: GoogleDriveErrorCode =
    error.code === "google-auth-expired"
      ? "owner-reconnect-required"
      : error.code;
  return new Response(
    JSON.stringify({
      error: { code, message: error.message, reason: error.reason },
    }),
    {
      status: HTTP_STATUS_BY_CODE[code],
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
