import { useState } from "react";
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
  discard: () => void;
}>;

/**
 * The draft of the active theme, stored per viewer with the hash of the
 * file it was made against. The gallery reloads whenever a theme file
 * changes, so the stored hash is what tells a stale draft apart.
 */
export function useStoredDraft(
  options: Readonly<{
    themeId: string;
    baseHash: string;
    storage: BrowserStorage;
  }>,
): StoredDraftState {
  const { themeId, baseHash, storage } = options;
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
  const draft = record?.draft ?? EMPTY_THEME_DRAFT;
  const store = (next: StoredThemeDraft) => {
    writeStoredThemeDraft(storage, themeId, next);
    setState({ themeId, record: next });
  };
  const isDirty = !isThemeDraftEmpty(draft);
  return {
    draft,
    isDirty,
    isChangedOnDisk:
      isDirty &&
      Boolean(record?.baseHash) &&
      Boolean(baseHash) &&
      record?.baseHash !== baseHash,
    setDraft: (next) =>
      store({ baseHash: record?.baseHash || baseHash, draft: next }),
    keepDraft: () => store({ baseHash, draft }),
    discard: () => store({ baseHash, draft: EMPTY_THEME_DRAFT }),
  };
}
