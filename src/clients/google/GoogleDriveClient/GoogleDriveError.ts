/** Machine-readable reason a Google Drive call failed. */
export type GoogleDriveErrorCode =
  /**
   * The Drive API is not enabled on the Cloud project behind the OAuth client.
   * A deployment error that arrives dressed as a permission error, which is why
   * it gets its own code instead of joining `file-not-accessible`.
   */
  | "drive-api-not-configured"

  /**
   * Drive refused to export because the rendered workbook exceeds its export
   * ceiling, documented at 10 MB of exported content.
   *
   * There is no client-side pre-check for this: the ceiling applies to the size
   * of the `.xlsx` Drive produces, and `files.get` reports no `size` for a
   * Google Workspace file. The refusal is the only signal.
   */
  | "export-too-large"

  /**
   * Drive will not open the file. Under the per-file `drive.file` scope this
   * one code necessarily covers two situations that the API does not
   * distinguish: the file was deleted, and the app's per-file grant was
   * withdrawn. A file the app holds no grant for is *invisible* rather than
   * forbidden, so Drive answers "not found" either way. Inventing a distinction
   * here would be inventing information.
   */
  | "file-not-accessible"

  /** The access token is expired or its grant was revoked. */
  | "google-auth-expired"

  /** Drive is throttling. Retryable. */
  | "rate-limited"

  /** Anything not recognized above, kept distinct so it is never mistaken. */
  | "unknown";

/** Builds the developer-facing message. Display copy belongs to the caller. */
function _buildDriveErrorMessage(
  options: Readonly<{
    code: GoogleDriveErrorCode;
    status: number;
    reason: string | undefined;
  }>,
): string {
  const detail =
    options.reason === undefined ?
      `HTTP ${options.status}`
    : `HTTP ${options.status}, reason "${options.reason}"`;
  return `Google Drive request failed (${options.code}): ${detail}.`;
}

/**
 * Thrown by every `GoogleDriveClient` call that does not get a 2xx.
 *
 * Callers branch on `code`, never on message prose, because the recovery
 * differs per code: `file-not-accessible` is fixed by re-picking the file in
 * the Google Picker, `google-auth-expired` by re-consenting, `export-too-large`
 * not at all, and `drive-api-not-configured` only by a deployment change.
 */
export class GoogleDriveError extends Error {
  /** Which Drive failure this is. */
  readonly code: GoogleDriveErrorCode;

  /** The HTTP status Drive answered with. */
  readonly status: number;

  /** Drive's own `error.errors[0].reason`, when it sent one. */
  readonly reason: string | undefined;

  /** Creates a Drive failure without formatting any display copy. */
  constructor(
    options: Readonly<{
      code: GoogleDriveErrorCode;
      status: number;
      reason?: string | undefined;
    }>,
  ) {
    super(
      _buildDriveErrorMessage({
        code: options.code,
        status: options.status,
        reason: options.reason,
      }),
    );
    this.name = "GoogleDriveError";
    this.code = options.code;
    this.status = options.status;
    this.reason = options.reason;
  }
}
