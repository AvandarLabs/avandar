import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

/** The Entries tab. Placeholder until the entry editor is built. */
export function DictionaryEntriesTab(_props: Readonly<Props>): ReactNode {
  return null;
}
