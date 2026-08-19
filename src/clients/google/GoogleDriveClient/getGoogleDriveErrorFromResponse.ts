import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { GoogleDriveErrorCode } from "@/clients/google/GoogleDriveClient/GoogleDriveError";

/**
 * Drive's error envelope, as much of it as this module reads.
 *
 * `error.errors[0].reason` is the field that separates one 403 from another:
 * an unconfigured API, an oversized export and a throttle all arrive as 403 and
 * mean entirely different things.
 */
type DriveErrorEnvelope = {
  error?: {
    errors?: Array<{ reason?: string }>;
  };
};

/** Reads Drive's error reason out of a response body, if it sent one. */
function _getReasonFromBody(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as DriveErrorEnvelope;
    return parsed.error?.errors?.[0]?.reason;
  } catch {
    // Drive answers `files.export` with a raw body, so a non-JSON error body is
    // an ordinary case rather than a surprise. The status alone still maps.
    return undefined;
  }
}

/** Maps one HTTP status and Drive reason onto a `GoogleDriveErrorCode`. */
function _getErrorCode(
  status: number,
  reason: string | undefined,
): GoogleDriveErrorCode {
  if (status === 401) {
    return "google-auth-expired";
  }
  if (status === 404) {
    // Deleted, or the per-file grant is gone. Indistinguishable by design.
    return "file-not-accessible";
  }
  if (status === 429) {
    return "rate-limited";
  }
  if (status === 403) {
    // Every meaningful distinction inside a 403 lives in the reason, so the
    // reason is checked before the status is allowed to stand on its own.
    switch (reason) {
      case "accessNotConfigured":
        return "drive-api-not-configured";
      case "exportSizeLimitExceeded":
        return "export-too-large";
      case "insufficientFilePermissions":
        return "file-not-accessible";
      case "userRateLimitExceeded":
      case "rateLimitExceeded":
        return "rate-limited";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

/**
 * Turns a non-2xx Drive response into a `GoogleDriveError`.
 *
 * Consumes the response body, so call it only on a response that has already
 * been found to be an error.
 *
 * @param response The failing Drive response.
 * @returns The mapped error, ready to throw.
 */
export async function getGoogleDriveErrorFromResponse(
  response: Response,
): Promise<GoogleDriveError> {
  const body = await response.text().catch(() => {
    return "";
  });
  const reason = _getReasonFromBody(body);

  return new GoogleDriveError({
    code: _getErrorCode(response.status, reason),
    status: response.status,
    reason,
  });
}
