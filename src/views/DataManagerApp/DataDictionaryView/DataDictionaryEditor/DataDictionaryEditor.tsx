import { useMemo, useState } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { DataDictionaryEditorTabs } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";
import { DataDictionaryHeader } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader";
import { DataDictionaryRail } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryRail/DataDictionaryRail";
import { DataDictionarySaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar";
import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import { useSaveDataDictionary } from "@/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryTabId } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  savedDraft: DataDictionary.Draft;
};

/**
 * Edits one dictionary. Entries and code lists are edited as one draft and
 * saved together from the save bar. The rail appears on the Used by tab
 * only, so the entry and code list editors get the full width for their
 * own side panes.
 */
export function DataDictionaryEditor({
  dictionary,
  savedDraft,
}: Readonly<Props>): ReactNode {
  const copy = useDictionaryCopy();
  const canEdit = useHasPermission("data_sources__can_edit_dictionaries");
  const { draft, setDraft, isDirty, discard, markSaved } =
    useDataDictionaryDraft(savedDraft);
  const issues = useMemo(() => {
    return DataDictionary.findDraftIssues(draft);
  }, [draft]);
  const { save, isSaving, saveError } = useSaveDataDictionary({
    onSaved: markSaved,
  });
  const [activeTab, setActiveTab] = useState<DataDictionaryTabId>("entries");
  const [selectedCodeListId, setSelectedCodeListId] = useState<
    DataDictionaryCodeList.Id | undefined
  >(draft.codeLists[0]?.id);

  return (
    <AppView>
      <DataDictionaryHeader
        dictionary={dictionary}
        draft={draft}
        canEdit={canEdit}
      />
      <AppViewBody
        rail={
          activeTab === "used-by" ? (
            <DataDictionaryRail dictionary={dictionary} />
          ) : undefined
        }
      >
        <DataDictionaryEditorTabs
          draft={draft}
          issues={issues}
          canEdit={canEdit}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedCodeListId={selectedCodeListId}
          onSelectCodeList={setSelectedCodeListId}
          onOpenCodeList={(codeListId) => {
            setSelectedCodeListId(codeListId);
            setActiveTab("code-lists");
          }}
          onDraftChange={setDraft}
        />
        {isDirty ? (
          <DataDictionarySaveBar
            issueCount={issues.length}
            isSaving={isSaving}
            saveErrorMessage={
              saveError ? copy.describeSaveError(saveError) : undefined
            }
            onDiscard={discard}
            onSave={() => {
              save(
                DataDictionary.buildSavePayload({
                  dictionaryId: dictionary.id,
                  draft,
                }),
              );
            }}
          />
        ) : null}
      </AppViewBody>
    </AppView>
  );
}
