import { useState } from "react";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type DataDictionaryDraftState = {
  draft: DataDictionary.Draft;
  setDraft: (draft: DataDictionary.Draft) => void;
  /** Whether the draft differs from what was last loaded or saved. */
  isDirty: boolean;
  /** Throws the edits away and returns to the last loaded or saved draft. */
  discard: () => void;
  /** Records the current draft as saved, so it reads as clean. */
  markSaved: () => void;
};

/**
 * Holds the editable copy of a dictionary's contents.
 *
 * A newer saved draft from the server replaces the editable copy only while
 * there are no unsaved edits, so a background refetch never wipes someone's
 * work and a fresh load always shows up when nothing is being edited.
 *
 * @param savedDraft The contents as last loaded from the server.
 */
export function useDataDictionaryDraft(
  savedDraft: DataDictionary.Draft,
): DataDictionaryDraftState {
  const savedKey = JSON.stringify(savedDraft);
  const [syncedKey, setSyncedKey] = useState(savedKey);
  const [base, setBase] = useState(savedDraft);
  const [draft, setDraft] = useState(savedDraft);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(base);

  // Adjusting state during render, rather than in an effect, so the newer
  // saved draft and the screen never disagree for a frame.
  if (savedKey !== syncedKey && !isDirty) {
    setSyncedKey(savedKey);
    setBase(savedDraft);
    setDraft(savedDraft);
  }

  return {
    draft,
    setDraft,
    isDirty,
    discard: () => {
      setDraft(base);
    },
    markSaved: () => {
      setBase(draft);
    },
  };
}
