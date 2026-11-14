import { getValueAtPath } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import {
  EMPTY_THEME_DRAFT,
  getDocumentPathFromTokenPath,
  isThemeDraftEmpty,
  listTokenPathsFromPatch,
  removeValueAtPath,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import type {
  VideoThemeDocument,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";
import type { StoredThemeDraft } from "../themeDraftStorage/themeDraftStorage";

/** The stored record of one theme, or undefined when nothing is stored. */
export type DraftRecord = StoredThemeDraft | undefined;

/**
 * The record after an edit. The edit is made against the file as it is now
 * when the draft had no edits, because an empty draft has no stale edits to
 * outlive a file change. Otherwise it keeps the hash the draft started from,
 * so the banner can tell the file changed under those edits.
 */
export function createEditedRecord(
  options: Readonly<{
    /** The hash the stored record was made against, if there is one. */
    previousHash: string | undefined;
    /** Whether the draft held edits before this one. */
    hadEdits: boolean;
    fileHash: string;
    draft: ThemeDraft;
  }>,
): StoredThemeDraft {
  const { previousHash, hadEdits, fileHash, draft } = options;
  const baseHash = hadEdits
    ? previousHash || fileHash
    : fileHash || previousHash || "";
  return { baseHash, draft };
}

/** The record that keeps the draft on top of the file as it is now. */
export function createKeptRecord(
  options: Readonly<{ fileHash: string; draft: ThemeDraft }>,
): StoredThemeDraft {
  return { baseHash: options.fileHash, draft: options.draft };
}

/** The record that keeps the draft as made against the file with this hash. */
export function createRebasedRecord(
  options: Readonly<{ baseHash: string; draft: ThemeDraft }>,
): StoredThemeDraft {
  return { baseHash: options.baseHash, draft: options.draft };
}

/** The record with every edit dropped, against the file as it is now. */
export function createDiscardedRecord(fileHash: string): StoredThemeDraft {
  return { baseHash: fileHash, draft: EMPTY_THEME_DRAFT };
}

/**
 * Whether the theme file changed after the stored edits were made. A draft
 * with no edits, or a missing hash on either side, is never in conflict.
 */
export function isRecordChangedOnDisk(
  options: Readonly<{ record: DraftRecord; fileHash: string }>,
): boolean {
  const { record, fileHash } = options;
  return (
    record !== undefined &&
    !isThemeDraftEmpty(record.draft) &&
    Boolean(record.baseHash) &&
    Boolean(fileHash) &&
    record.baseHash !== fileHash
  );
}
