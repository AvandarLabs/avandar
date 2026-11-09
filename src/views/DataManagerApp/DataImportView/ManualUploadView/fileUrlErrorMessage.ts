import { msg } from "@lingui/core/macro";
import type { FileUrlFailureReason } from "$/fileUrl/AcquiredPastedFile.ts";
import type { I18n, MessageDescriptor } from "@lingui/core";

/**
 * The sentence under the link field when a pasted link cannot be imported.
 * `limitLabel` is the download ceiling, already formatted for the locale.
 */
export function fileUrlErrorMessage(
  i18n: I18n,
  reason: FileUrlFailureReason,
  limitLabel: string,
): string {
  return i18n._(_descriptor(reason, limitLabel));
}

function _descriptor(
  reason: FileUrlFailureReason,
  limitLabel: string,
): MessageDescriptor {
  switch (reason) {
    case "not-a-url":
      return msg`Enter a link that starts with http:// or https://.`;
    case "unsupported-scheme":
      return msg`Avandar can only download a public http or https link.`;
    case "github-not-a-file":
      return msg`This GitHub link is a page, not a file. Open the file and paste that link.`;
    case "drive-folder":
      return msg`This Google Drive link is a folder. Paste a link to one file.`;
    case "google-sheet":
      return msg`This is a Google Sheet. Add it from Connectors so it stays connected.`;
    case "google-document":
      return msg`Avandar can't import a Google Doc or a Slides deck. Paste a link to a CSV, Excel, or PDF file.`;
    case "dropbox-folder":
      return msg`This Dropbox link is a folder. Paste a link to one file.`;
    case "private-address":
      return msg`Avandar can't download from a private or local address.`;
    case "unreachable":
      return msg`Avandar couldn't download that link. Check it and try again.`;
    case "not-public":
      return msg`That link isn't public. Avandar can only download a file anyone can open.`;
    case "too-large":
      return msg`That file is larger than ${limitLabel}, which is the most Avandar can download from a link.`;
    case "unsupported-type":
      return msg`That link isn't a CSV, Excel, or PDF file.`;
    case "archive-empty":
      return msg`That archive doesn't contain a CSV, Excel, or PDF file.`;
    case "archive-nested-only":
      return msg`That archive only contains another archive. Paste a link to the file itself.`;
    case "member-missing":
      return msg`That file is no longer in the download. Choose another one.`;
  }
}
