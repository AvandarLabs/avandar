import { getValueAtPath } from "../../../videoTheme/getValueAtPath";
import { getDocumentPathFromTokenPath } from "../../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { removeValueAtPath } from "../../removeValueAtPath";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  ThemeDrafts,
} from "../../ThemeDrafts/ThemeDrafts";
import type {
  VideoThemeDocument,
  VideoThemePatch,
} from "../../../videoTheme/videoTheme.types";
import type { StoredThemeDraft } from "../../ThemeDraftStorage/ThemeDraftStorage";
/** The stored record of one theme, or undefined when nothing is stored. */
export type DraftRecord = StoredThemeDraft | undefined;
/**
 * The record after an edit. The edit is made against the file as it is now
 * when the draft had no edits, because an empty draft has no stale edits to
 * outlive a file change. Otherwise it keeps the hash the draft started from,
 * so the banner can tell the file changed under those edits.
 */
function _makeEditedRecordFromDraft(
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
function _makeKeptRecordFromDraft(
  options: Readonly<{
    fileHash: string;
    draft: ThemeDraft;
  }>,
): StoredThemeDraft {
  return { baseHash: options.fileHash, draft: options.draft };
}
/** The record that keeps the draft as made against the file with this hash. */
function _makeRebasedRecordFromDraft(
  options: Readonly<{
    baseHash: string;
    draft: ThemeDraft;
  }>,
): StoredThemeDraft {
  return { baseHash: options.baseHash, draft: options.draft };
}
/** The record with every edit dropped, against the file as it is now. */
function _makeDiscardedRecordFromFileHash(fileHash: string): StoredThemeDraft {
  return { baseHash: fileHash, draft: EMPTY_THEME_DRAFT };
}
/**
 * Whether the theme file changed after the stored edits were made. A draft
 * with no edits, or a missing hash on either side, is never in conflict.
 */
function _isRecordChangedOnDisk(
  options: Readonly<{
    record: DraftRecord;
    fileHash: string;
  }>,
): boolean {
  const { record, fileHash } = options;
  return (
    record !== undefined &&
    !ThemeDrafts.isThemeDraftEmpty(record.draft) &&
    Boolean(record.baseHash) &&
    Boolean(fileHash) &&
    record.baseHash !== fileHash
  );
}
function _isDeepEqual({
  left,
  right,
}: Readonly<{
  left: unknown;
  right: unknown;
}>): boolean {
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
    leftEntries.every(([key, value]) => {
      return (
        Object.hasOwn(right, key) &&
        _isDeepEqual({
          left: value,
          right: (right as Record<string, unknown>)[key],
        })
      );
    })
  );
}
/** The patch without the tokens whose value the saved patch already holds. */
function _omitSavedTokens({
  patch,
  saved,
}: Readonly<{
  patch: VideoThemePatch;
  saved: VideoThemePatch;
}>): VideoThemePatch {
  return ThemeDrafts.listTokenPathsFromPatch(patch).reduce<VideoThemePatch>(
    (result, tokenPath) => {
      const documentPath = getDocumentPathFromTokenPath(tokenPath);
      return _isDeepEqual({
        left: getValueAtPath({
          source: patch,
          path: documentPath,
        }),
        right: getValueAtPath({
          source: saved,
          path: documentPath,
        }),
      })
        ? removeValueAtPath({ source: result, path: documentPath })
        : result;
    },
    patch,
  );
}
function _omitSavedOverrides({
  overrides,
  savedDocument,
}: Readonly<{
  overrides: ThemeDraft["overrides"];
  savedDocument: VideoThemeDocument;
}>): ThemeDraft["overrides"] {
  return Object.fromEntries(
    Object.entries(overrides)
      .map(([itemId, patch]) => {
        return [
          itemId,
          _omitSavedTokens({
            patch,
            saved: savedDocument.overrides?.[itemId] ?? {},
          }),
        ] as const;
      })
      .filter(([, patch]) => {
        return Object.keys(patch).length > 0;
      }),
  );
}
/** Whether two drafts hold exactly the same edits. */
function _isDraftUnchanged(
  options: Readonly<{
    savedDraft: ThemeDraft;
    currentDraft: ThemeDraft;
  }>,
): boolean {
  return _isDeepEqual({
    left: options.savedDraft,
    right: options.currentDraft,
  });
}
/**
 * The latest draft of one theme from a record of each theme's last draft, or
 * the fallback when none is recorded. Reading by theme id keeps a theme
 * switch during a request from handing one theme another theme's draft.
 */
function _getLatestDraftOfTheme(
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
function _makeDraftFromSave(
  options: Readonly<{
    themeId: string;
    savedDraft: ThemeDraft;
    savedDocument: VideoThemeDocument;
    latestDrafts: ReadonlyMap<string, ThemeDraft>;
  }>,
): ThemeDraft {
  const { themeId, savedDraft, savedDocument, latestDrafts } = options;
  const currentDraft = _getLatestDraftOfTheme({
    latestDrafts,
    themeId,
    fallback: savedDraft,
  });
  if (_isDraftUnchanged({ savedDraft, currentDraft })) {
    return EMPTY_THEME_DRAFT;
  }
  return {
    patch: _omitSavedTokens({
      patch: currentDraft.patch,
      saved: savedDocument,
    }),
    overrides: _omitSavedOverrides({
      overrides: currentDraft.overrides,
      savedDocument,
    }),
  };
}

/** Updates stored draft records across edits, disk conflicts, and saves. */
export const StoredDraftRecords = {
  /** The record after an edit. */
  makeEditedRecordFromDraft: _makeEditedRecordFromDraft,
  /** The record that keeps the draft on top of the file as it is now. */
  makeKeptRecordFromDraft: _makeKeptRecordFromDraft,
  /**
   * The record that keeps the draft as made against the file with this hash.
   */
  makeRebasedRecordFromDraft: _makeRebasedRecordFromDraft,
  /** The record with every edit dropped, against the file as it is now. */
  makeDiscardedRecordFromFileHash: _makeDiscardedRecordFromFileHash,
  /** Whether the theme file changed after the stored edits were made. */
  isRecordChangedOnDisk: _isRecordChangedOnDisk,
  /** Whether two drafts hold exactly the same edits. */
  isDraftUnchanged: _isDraftUnchanged,
  /**
   * The latest draft of one theme from a record of each theme's last draft, or
   * the fallback when none is recorded.
   */
  getLatestDraftOfTheme: _getLatestDraftOfTheme,
  /** The draft to keep once a save succeeded. */
  makeDraftFromSave: _makeDraftFromSave,
};
