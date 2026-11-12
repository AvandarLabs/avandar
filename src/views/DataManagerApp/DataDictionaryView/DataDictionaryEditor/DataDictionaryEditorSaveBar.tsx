import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionarySaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import { useSaveDataDictionary } from "@/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionaryId: DataDictionary.Id;
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  onDiscard: () => void;
  onSaved: (savedDraft: DataDictionary.Draft) => void;
};

/**
 * The save bar wired to the dictionary save. Saves the draft as it is when
 * Save is pressed, so edits made while the save is in flight stay unsaved.
 * Discarding also clears an old save error.
 */
export function DataDictionaryEditorSaveBar({
  dictionaryId,
  draft,
  issues,
  onDiscard,
  onSaved,
}: Readonly<Props>): ReactNode {
  const copy = useDictionaryCopy();
  const { save, isSaving, saveError, resetSaveError } = useSaveDataDictionary({
    onSaved,
  });

  return (
    <DataDictionarySaveBar
      issueCount={issues.length}
      isSaving={isSaving}
      saveErrorMessage={
        saveError ? copy.describeSaveError(saveError) : undefined
      }
      onDiscard={() => {
        resetSaveError();
        onDiscard();
      }}
      onSave={() => {
        const sentDraft = draft;
        save(
          DataDictionary.buildSavePayload({ dictionaryId, draft: sentDraft }),
          sentDraft,
        );
      }}
    />
  );
}
