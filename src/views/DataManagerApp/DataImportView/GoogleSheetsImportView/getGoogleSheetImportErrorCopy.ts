import { msg } from "@lingui/core/macro";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { I18n, MessageDescriptor } from "@lingui/core";

/** The notification a failed Google Sheets import shows. */
export type GoogleSheetImportErrorCopy = {
  title: string;
  message: string;
};

type CopyDescriptors = {
  title: MessageDescriptor;
  message: MessageDescriptor;
};

const GENERIC_FAILURE: CopyDescriptors = {
  title: msg`Google Sheet failed to load`,
  message: msg`An error occurred while loading the file`,
};

/**
 * Chooses the message pair for one Drive failure.
 *
 * Split out from the `i18n._` calls so every string stays a `msg` macro at its
 * own call site: `docs/rules/i18n.md` bans relocating a `` t`…` `` macro out of
 * its lexical scope, because the extractor cannot follow it and the strings
 * never reach the catalogs.
 */
function _getCopyDescriptors(error: unknown): CopyDescriptors {
  if (!(error instanceof GoogleDriveError)) {
    return GENERIC_FAILURE;
  }

  switch (error.code) {
    case "drive-api-not-configured":
      return {
        title: msg`Google Sheet failed to load`,
        message: msg`Google Drive access is not configured for this deployment.`,
      };
    case "export-too-large":
      return {
        title: msg`Google Sheet is too large`,
        message: msg`Google can export at most 10 MB of a spreadsheet at a time. Split the sheet and try again.`,
      };
    case "file-not-accessible":
      return {
        title: msg`Google Sheet is not available`,
        message: msg`Avandar cannot open this Google Sheet. It may have been deleted, or its access may have been removed. Pick the sheet again to restore access.`,
      };
    case "google-auth-expired":
      return {
        title: msg`Your Google connection expired`,
        message: msg`Reconnect your Google account and try again.`,
      };
    case "rate-limited":
      return {
        title: msg`Google is rate limiting this request`,
        message: msg`Please try again in a moment.`,
      };
    case "unknown":
      return GENERIC_FAILURE;
  }
}

/**
 * Turns a failed Google Sheets import into the copy the user sees.
 *
 * Branches on `GoogleDriveError.code` and never on message prose, because the
 * recoveries differ: a withdrawn per-file grant is fixed by picking the file
 * again, an expired token by reconnecting Google, an oversized export not at
 * all, and an unconfigured Drive API only by a deployment change.
 *
 * Note what is deliberately **not** distinguished. Under the per-file
 * `drive.file` scope, a deleted file and a withdrawn grant both come back as
 * 404: a file the app holds no grant for is invisible rather than forbidden.
 * One message covers both, and it happens that one recovery does too, since
 * picking the sheet again either re-grants it or lets the user choose another.
 *
 * @param params The thrown error, and the reactive `i18n` from `useLingui()`.
 * @returns The notification title and message.
 */
export function getGoogleSheetImportErrorCopy(
  params: Readonly<{
    error: unknown;
    i18n: I18n;
  }>,
): GoogleSheetImportErrorCopy {
  const descriptors = _getCopyDescriptors(params.error);
  return {
    title: params.i18n._(descriptors.title),
    message: params.i18n._(descriptors.message),
  };
}
