import { getValueAtPath } from "../../../videoTheme/getValueAtPath";
import { getDocumentPathFromTokenPath } from "../../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { removeValueAtPath } from "../../removeValueAtPath";
import {
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  listTokenPathsFromPatch,
  type ThemeDraft,
} from "../../themeDraft/themeDraft";
import type {
  VideoThemeDocument,
  VideoThemePatch,
} from "../../../videoTheme/videoTheme.types";
import type { StoredThemeDraft } from "../../themeDraftStorage/themeDraftStorage";

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

function _isDeepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (
    typeof left !== "object" ||
    typeof right !== "object" ||
    left === null ||
    right === null
  ) {
    return false;
  }
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(
      ([key, value]) =>
        Object.hasOwn(right, key) &&
        _isDeepEqual(value, (right as Record<string, unknown>)[key]),
    )
  );
}

/** The patch without the tokens whose value the saved patch already holds. */
function _omitSavedTokens(
  patch: VideoThemePatch,
  saved: VideoThemePatch,
): VideoThemePatch {
  return listTokenPathsFromPatch(patch).reduce<VideoThemePatch>(
    (result, tokenPath) => {
      const documentPath = getDocumentPathFromTokenPath(tokenPath);
      return _isDeepEqual(
        getValueAtPath(patch, documentPath),
        getValueAtPath(saved, documentPath),
      )
        ? removeValueAtPath({ source: result, path: documentPath })
        : result;
    },
    patch,
  );
}

function _omitSavedOverrides(
  overrides: ThemeDraft["overrides"],
  savedDocument: VideoThemeDocument,
): ThemeDraft["overrides"] {
  return Object.fromEntries(
    Object.entries(overrides)
      .map(
        ([itemId, patch]) =>
          [
            itemId,
            _omitSavedTokens(patch, savedDocument.overrides?.[itemId] ?? {}),
          ] as const,
      )
      .filter(([, patch]) => Object.keys(patch).length > 0),
  );
}

/** Whether two drafts hold exactly the same edits. */
export function isDraftUnchanged(
  options: Readonly<{ savedDraft: ThemeDraft; currentDraft: ThemeDraft }>,
): boolean {
  return _isDeepEqual(options.savedDraft, options.currentDraft);
}

/**
 * The latest draft of one theme from a record of each theme's last draft, or
 * the fallback when none is recorded. Reading by theme id keeps a theme
 * switch during a request from handing one theme another theme's draft.
 */
export function getLatestDraftOfTheme(
  options: Readonly<{
    latestDrafts: ReadonlyMap<string, ThemeDraft>;
    themeId: string;
    fallback: ThemeDraft;
  }>,
): ThemeDraft {
  return options.latestDrafts.get(options.themeId) ?? options.fallback;
}

/**
 * The draft to keep once a save succeeded. When the saved theme's draft did
 * not change since the save started it is empty. Otherwise the edits made to
 * that theme during the save stay, minus any value the saved file already
 * holds, so they sit on top of the saved theme. Only the saved theme's own
 * latest draft is read, so switching to another theme during the save never
 * copies that theme's draft over.
 *
 * A draft can only set a value, never remove one the file holds. A token
 * reset during the save was already saved, so the reset is dropped and the
 * saved value stays.
 */
export function createDraftAfterSave(
  options: Readonly<{
    themeId: string;
    savedDraft: ThemeDraft;
    savedDocument: VideoThemeDocument;
    latestDrafts: ReadonlyMap<string, ThemeDraft>;
  }>,
): ThemeDraft {
  const { themeId, savedDraft, savedDocument, latestDrafts } = options;
  const currentDraft = getLatestDraftOfTheme({
    latestDrafts,
    themeId,
    fallback: savedDraft,
  });
  if (isDraftUnchanged({ savedDraft, currentDraft })) {
    return EMPTY_THEME_DRAFT;
  }
  return {
    patch: _omitSavedTokens(currentDraft.patch, savedDocument),
    overrides: _omitSavedOverrides(currentDraft.overrides, savedDocument),
  };
}
