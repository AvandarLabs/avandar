import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_THEME_DRAFT,
  type ThemeDraft,
  ThemeDrafts,
} from "../ThemeDrafts/ThemeDrafts";
import {
  type StoredThemeDraft,
  ThemeDraftStorage,
} from "../ThemeDraftStorage/ThemeDraftStorage";
import { StoredDraftRecords } from "./StoredDraftRecords/StoredDraftRecords";
import type { BrowserStorage } from "./getBrowserStorage";

/** One theme's persisted draft and what can be done with it. */
export type StoredDraftState = Readonly<{
  draft: ThemeDraft;
  isDirty: boolean;
  /** The theme file changed after these edits were made. */
  isChangedOnDisk: boolean;
  setDraft: (draft: ThemeDraft) => void;
  /** Keeps the edits on top of the current file and clears the banner. */
  keepDraft: () => void;
  /**
   * Records the edits, or the given ones in their place, as made against the
   * file with this hash.
   */
  rebaseDraft: (
    options: Readonly<{ baseHash: string; draft?: ThemeDraft }>,
  ) => void;
  discard: () => void;
}>;

type StoredDraftOptions = Readonly<{
  themeId: string;
  baseHash: string;
  storage: BrowserStorage;
}>;

/**
 * The stored record of the active theme, re-read when the theme changes,
 * and a stable function that writes a new record.
 */
function useStoredDraftRecord(options: StoredDraftOptions) {
  const { themeId, storage } = options;
  const [state, setState] = useState(() => {
    return {
      themeId,
      record: ThemeDraftStorage.readStoredThemeDraft({ storage, themeId }),
    };
  });
  const record =
    state.themeId === themeId
      ? state.record
      : ThemeDraftStorage.readStoredThemeDraft({ storage, themeId });
  if (state.themeId !== themeId) {
    setState({ themeId, record });
  }
  const store = useCallback(
    (nextRecord: StoredThemeDraft) => {
      ThemeDraftStorage.writeStoredThemeDraft({
        storage,
        themeId,
        stored: nextRecord,
      });
      setState({ themeId, record: nextRecord });
    },
    [storage, themeId],
  );
  return { record, store };
}

/** The writes a stored draft offers, each a stable function over one record. */
type StoredDraftActions = Pick<
  StoredDraftState,
  "setDraft" | "keepDraft" | "rebaseDraft" | "discard"
>;

function useStoredDraftActions(
  options: Readonly<{
    store: (record: StoredThemeDraft) => void;
    draft: ThemeDraft;
    baseHash: string;
    recordHash: string | undefined;
    isDirty: boolean;
  }>,
): StoredDraftActions {
  const { store, draft, baseHash, recordHash, isDirty } = options;
  const setDraft = useCallback(
    (nextDraft: ThemeDraft) => {
      return store(
        StoredDraftRecords.makeEditedRecordFromDraft({
          previousHash: recordHash,
          hadEdits: isDirty,
          fileHash: baseHash,
          draft: nextDraft,
        }),
      );
    },
    [store, recordHash, isDirty, baseHash],
  );
  const keepDraft = useCallback(() => {
    return store(
      StoredDraftRecords.makeKeptRecordFromDraft({ fileHash: baseHash, draft }),
    );
  }, [store, baseHash, draft]);
  const rebaseDraft = useCallback(
    (rebaseOptions: Readonly<{ baseHash: string; draft?: ThemeDraft }>) => {
      return store(
        StoredDraftRecords.makeRebasedRecordFromDraft({
          baseHash: rebaseOptions.baseHash,
          draft: rebaseOptions.draft ?? draft,
        }),
      );
    },
    [store, draft],
  );
  const discard = useCallback(() => {
    return store(StoredDraftRecords.makeDiscardedRecordFromFileHash(baseHash));
  }, [store, baseHash]);
  return { setDraft, keepDraft, rebaseDraft, discard };
}

/**
 * The draft of the active theme, stored per viewer with the hash of the
 * file it was made against. The gallery reloads whenever a theme file
 * changes, so the stored hash is what tells a stale draft apart. The state
 * and its functions keep their identity until the draft, theme, or hash
 * changes, so a shared context does not re-render every consumer.
 */
export function useStoredDraft(options: StoredDraftOptions): StoredDraftState {
  const { baseHash } = options;
  const { record, store } = useStoredDraftRecord(options);
  const draft = record?.draft ?? EMPTY_THEME_DRAFT;
  const recordHash = record?.baseHash;
  const isDirty = !ThemeDrafts.isThemeDraftEmpty(draft);
  const { setDraft, keepDraft, rebaseDraft, discard } = useStoredDraftActions({
    store,
    draft,
    baseHash,
    recordHash,
    isDirty,
  });
  const isChangedOnDisk = StoredDraftRecords.isRecordChangedOnDisk({
    record,
    fileHash: baseHash,
  });
  return useMemo(() => {
    return {
      draft,
      isDirty,
      isChangedOnDisk,
      setDraft,
      keepDraft,
      rebaseDraft,
      discard,
    };
  }, [
    draft,
    isDirty,
    isChangedOnDisk,
    setDraft,
    keepDraft,
    rebaseDraft,
    discard,
  ]);
}
