import type { PastedFileUrlRefusal } from "$/fileUrl/PastedFileUrl.ts";

/** Why a pasted link did not become a file. */
export type FileUrlFailureReason =
  | PastedFileUrlRefusal
  | "private-address"
  | "unreachable"
  | "not-public"
  | "too-large"
  | "unsupported-type"
  | "archive-empty"
  | "archive-nested-only"
  | "member-missing";

/**
 * One file a person can choose from a multi-file archive or a portal page.
 * `url` is set when choosing it means downloading that address. An archive
 * member has no url: the original link is fetched again for that path.
 */
export type FileUrlChoiceMember = {
  path: string;
  size: number;
  mediaType: string;
  url?: string;
};

/**
 * The outcome of turning a pasted link into a file the upload flow can sniff.
 * A choice is the stop before a sniff, when the link holds more than one
 * data file.
 */
export type AcquiredPastedFile =
  | {
      outcome: "file";
      fileName: string;
      mediaType: string;
      bytes: Uint8Array;
      sourceLabel: string;
    }
  | {
      outcome: "choice";
      sourceLabel: string;
      members: FileUrlChoiceMember[];
    }
  | { outcome: "error"; reason: FileUrlFailureReason };
