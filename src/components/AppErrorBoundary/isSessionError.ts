import { SessionExpiredError } from "$/ServerApiClient";

/**
 * Signatures of an authentication/session failure that should drive the user
 * back to sign-in rather than surface as a generic crash. Matched against the
 * error message (case-insensitively) as a fallback for raw errors that are not
 * already normalized into a {@link SessionExpiredError}, e.g. a PostgREST
 * `JWSError JWSInvalidSignature`, a GoTrue `invalid_token`, or an edge
 * verifier `JOSENotSupported` bubbling up from a query.
 */
const SESSION_ERROR_SIGNATURES = [
  "jwserror",
  "jwsinvalidsignature",
  "invalid_token",
  "invalid jwt",
  "jwt expired",
  "unregistered api key",
  "invalid api key",
  "josenotsupported",
];

/**
 * Whether an unknown error represents a dead/expired auth session: either an
 * explicit {@link SessionExpiredError} thrown by the ServerApi layer, or a raw
 * auth error whose message matches a known signature. Used by the app-level
 * error boundary to recover gracefully (sign out + redirect) instead of
 * crashing the page.
 *
 * @param error - The caught error, of unknown shape.
 * @returns `true` if the error should be treated as a session failure.
 */
export function isSessionError(error: unknown): boolean {
  if (error instanceof SessionExpiredError) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();
  return SESSION_ERROR_SIGNATURES.some((signature) => {
    return normalized.includes(signature);
  });
}
