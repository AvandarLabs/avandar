import type { ExternalDatasetErrorCode } from "@sbfn/connectors/connectors/ExternalDatasetConnector.ts";

function _getErrorCode(error: unknown): string | undefined {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function _getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Maps a thrown connection/query error to the route table's closed
 * error-code set, so `test-and-save` and every other route can return a
 * specific, user-facing reason instead of one generic failure. Unrecognized
 * shapes fall back to `"unknown"` rather than guessing - a wrong-but-confident
 * code (e.g. reporting `auth_failed` for what was actually a timeout) would
 * send the user chasing the wrong fix.
 */
export function classifyPostgresConnectionError(
  error: unknown,
): ExternalDatasetErrorCode {
  const code = _getErrorCode(error);
  const message = _getErrorMessage(error).toLowerCase();

  // Postgres wire-protocol auth failures (SQLSTATE class 28).
  if (code === "28P01" || code === "28000" || code?.startsWith("28")) {
    return "auth_failed";
  }

  // Node-level TCP failures: host/port is not reachable at all.
  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "EAI_AGAIN"
  ) {
    return "unreachable";
  }

  if (
    code === "ETIMEDOUT" ||
    code === "CONNECT_TIMEOUT" ||
    message.includes("timeout")
  ) {
    return "timeout";
  }

  if (message.includes("ssl") || message.includes("tls")) {
    return "ssl_required";
  }

  if (
    message.includes("password authentication failed") ||
    message.includes("authentication failed")
  ) {
    return "auth_failed";
  }

  return "unknown";
}
