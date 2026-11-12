import { useState } from "react";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryTabId } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryEditor/DataDictionaryEditorTabs";

/** The open tab and selected code list of the Dictionary editor. */
export type EditorSelection = {
  activeTab: DataDictionaryTabId;
  setActiveTab: (tabId: DataDictionaryTabId) => void;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  setSelectedCodeListId: (codeListId: DataDictionaryCodeList.Id) => void;
  /** Selects a code list and switches to the Code lists tab. */
  openCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

/**
 * Which tab of a dictionary is open and which code list is selected on the
 * Code lists tab, starting on Entries with the first code list selected.
 */
export function useEditorSelection(
  draft: DataDictionary.Draft,
): EditorSelection {
  const [activeTab, setActiveTab] = useState<DataDictionaryTabId>("entries");
  const [selectedCodeListId, setSelectedCodeListId] = useState<
    DataDictionaryCodeList.Id | undefined
  >(draft.codeLists[0]?.id);

  return {
    activeTab,
    setActiveTab,
    selectedCodeListId,
    setSelectedCodeListId,
    openCodeList: (codeListId) => {
      setSelectedCodeListId(codeListId);
      setActiveTab("code-lists");
    },
  };
}
