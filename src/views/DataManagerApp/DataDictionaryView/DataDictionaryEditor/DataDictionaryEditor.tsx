import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { DataDictionaryEditorSaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorSaveBar";
import { DataDictionaryEditorTabs } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";
import { useEditorSelection } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/useEditorSelection";
import { DataDictionaryHeader } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryHeader/DataDictionaryHeader";
import { DataDictionaryRail } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryRail/DataDictionaryRail";
import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
import { useDictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { DataDictionaryTabId } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  savedDraft: DataDictionary.Draft;
};

/** The Used by rail, shown only while that tab is open. */
function _buildRail(
  options: Readonly<{
    activeTab: DataDictionaryTabId;
    dictionary: DataDictionary.T;
  }>,
): ReactNode {
  return options.activeTab === "used-by" ? (
    <DataDictionaryRail dictionary={options.dictionary} />
  ) : undefined;
}

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
  const canEdit = useHasPermission("data_sources__can_edit_dictionaries");
  const { draft, setDraft, isDirty, discard, markSaved } =
    useDataDictionaryDraft(savedDraft);
  const issues = useMemo(() => {
    return DataDictionary.findDraftIssues(draft);
  }, [draft]);
  const selection = useEditorSelection(draft);
  const usage = useDictionaryUsage({
    dictionaryId: dictionary.id,
    dictionaryName: dictionary.name,
    currentVersion: dictionary.version,
  });
  const usedByCount =
    usage.isLoading || usage.hasError ? undefined : usage.rows.length;

  return (
    <AppView>
      <DataDictionaryHeader
        dictionary={dictionary}
        draft={draft}
        canEdit={canEdit}
        usedByCount={usedByCount}
      />
      <AppViewBody
        rail={_buildRail({ activeTab: selection.activeTab, dictionary })}
      >
        <DataDictionaryEditorTabs
          draft={draft}
          issues={issues}
          canEdit={canEdit}
          selection={selection}
          usage={usage}
          onDraftChange={setDraft}
        />
        <DataDictionaryEditorSaveBar
          isDirty={isDirty}
          dictionaryId={dictionary.id}
          draft={draft}
          issues={issues}
          onDiscard={discard}
          onSaved={markSaved}
        />
      </AppViewBody>
    </AppView>
  );
}
