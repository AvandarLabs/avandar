import { UnsafeHostError } from "@sbfn/_shared/validateHostNotPrivate.ts";
import type { ConnectorErrorCode } from "@sbfn/connectors/Connector.ts";

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
 * Classifies by the error's own `code` field (Postgres SQLSTATE or Node's
 * TCP/timeout codes).
 */
function _classifyByErrorCode(
  code: string | undefined,
): ConnectorErrorCode | undefined {
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

  if (code === "ETIMEDOUT" || code === "CONNECT_TIMEOUT") {
    return "timeout";
  }

  return undefined;
}

/**
 * Classifies by the error's own lower-cased message, when its code alone
 * did not match.
 */
function _classifyByErrorMessage(
  message: string,
): ConnectorErrorCode | undefined {
  if (message.includes("timeout")) {
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

  return undefined;
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
): ConnectorErrorCode {
  // Checked by exact type first, ahead of every heuristic below: this is the
  // SSRF guard refusing a host that resolved to a loopback, link-local, or
  // private address, never a network-level failure the heuristics below are
  // meant to recognize.
  if (error instanceof UnsafeHostError) {
    return "host_not_allowed";
  }

  const code = _getErrorCode(error);
  const message = _getErrorMessage(error).toLowerCase();

  // A server that only accepts SSL rejects a plain connection through
  // pg_hba.conf with SQLSTATE 28000, the same class as a wrong password, so
  // its message has to be checked ahead of the code.
  if (
    message.includes("no pg_hba.conf entry") &&
    message.includes("no encryption")
  ) {
    return "ssl_required";
  }

  return (
    _classifyByErrorCode(code) ?? _classifyByErrorMessage(message) ?? "unknown"
  );
}
