import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import {
  readStoredThemeDraft,
  writeStoredThemeDraft,
  type StoredThemeDraft,
} from "../themeDraftStorage/themeDraftStorage";
import type { BrowserStorage } from "./browserStorage";

/** One theme's persisted draft and what can be done with it. */
export type StoredDraftState = Readonly<{
  draft: ThemeDraft;
  isDirty: boolean;
  /** The theme file changed after these edits were made. */
  isChangedOnDisk: boolean;
  setDraft: (draft: ThemeDraft) => void;
  /** Keeps the edits on top of the current file and clears the banner. */
  keepDraft: () => void;
  /** Keeps the edits and records them as made against the file with this hash. */
  rebaseDraft: (baseHash: string) => void;
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
  const [state, setState] = useState(() => ({
    themeId,
    record: readStoredThemeDraft(storage, themeId),
  }));
  const record =
    state.themeId === themeId
      ? state.record
      : readStoredThemeDraft(storage, themeId);
  if (state.themeId !== themeId) {
    setState({ themeId, record });
  }
  const store = useCallback(
    (nextRecord: StoredThemeDraft) => {
      writeStoredThemeDraft(storage, themeId, nextRecord);
      setState({ themeId, record: nextRecord });
    },
    [storage, themeId],
  );
  return { record, store };
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
  const setDraft = useCallback(
    (nextDraft: ThemeDraft) =>
      store({ baseHash: recordHash || baseHash, draft: nextDraft }),
    [store, recordHash, baseHash],
  );
  const keepDraft = useCallback(
    () => store({ baseHash, draft }),
    [store, baseHash, draft],
  );
  const rebaseDraft = useCallback(
    (nextBaseHash: string) => store({ baseHash: nextBaseHash, draft }),
    [store, draft],
  );
  const discard = useCallback(
    () => store({ baseHash, draft: EMPTY_THEME_DRAFT }),
    [store, baseHash],
  );
  const isDirty = !isThemeDraftEmpty(draft);
  const isChangedOnDisk =
    isDirty &&
    Boolean(recordHash) &&
    Boolean(baseHash) &&
    recordHash !== baseHash;
  return useMemo(
    () => ({
      draft,
      isDirty,
      isChangedOnDisk,
      setDraft,
      keepDraft,
      rebaseDraft,
      discard,
    }),
    [
      draft,
      isDirty,
      isChangedOnDisk,
      setDraft,
      keepDraft,
      rebaseDraft,
      discard,
    ],
  );
}
