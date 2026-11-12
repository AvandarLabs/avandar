import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  onSelectCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** The Code lists tab. Placeholder until the code list editor is built. */
export function DictionaryCodeListsTab(_props: Readonly<Props>): ReactNode {
  return null;
}
