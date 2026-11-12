import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import css from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditor.module.css";
import { DictionaryCodeListsTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab";
import { DictionaryEntriesTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab";
import { DictionaryUsedByTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTab";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

const TAB_IDS = ["entries", "code-lists", "used-by"] as const;

/** The tabs of the Dictionary view. */
export type DataDictionaryTabId = (typeof TAB_IDS)[number];

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  activeTab: DataDictionaryTabId;
  onTabChange: (tabId: DataDictionaryTabId) => void;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  onSelectCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** The Entries, Code lists, and Used by tabs of one dictionary. */
export function DataDictionaryEditorTabs(props: Readonly<Props>): ReactNode {
  const { draft, issues, canEdit, activeTab, onTabChange } = props;
  const { t } = useLingui();
  const entryCount = draft.entries.length;
  const codeListCount = draft.codeLists.length;

  return (
    <Tabs
      tabIds={TAB_IDS}
      value={activeTab}
      onTabChange={onTabChange}
      classNames={{ list: css.dataDictionaryEditorTabList }}
      renderTabHeader={{
        entries: t`Entries · ${entryCount}`,
        "code-lists": t`Code lists · ${codeListCount}`,
        "used-by": t`Used by`,
      }}
      renderTabPanel={{
        entries: () => {
          return (
            <DictionaryEntriesTab
              draft={draft}
              issues={issues}
              canEdit={canEdit}
              onDraftChange={props.onDraftChange}
              onOpenCodeList={props.onOpenCodeList}
            />
          );
        },
        "code-lists": () => {
          return (
            <DictionaryCodeListsTab
              draft={draft}
              issues={issues}
              canEdit={canEdit}
              selectedCodeListId={props.selectedCodeListId}
              onSelectCodeList={props.onSelectCodeList}
              onDraftChange={props.onDraftChange}
            />
          );
        },
        "used-by": () => {
          return <DictionaryUsedByTab />;
        },
      }}
    />
  );
}
