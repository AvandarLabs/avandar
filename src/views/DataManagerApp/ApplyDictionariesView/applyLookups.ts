import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { WorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";

/**
 * The workspace's dictionary rows by id, for the apply flow's side pane and
 * summary, which name a pick's dictionary, entry, and code list.
 */
export type ApplyLookups = {
  dictionaryNames: ReadonlyMap<string, string>;
  entries: ReadonlyMap<string, DataDictionaryEntry.T>;
  codeLists: ReadonlyMap<string, DataDictionaryCodeList.T>;
};

/** Indexes the workspace's dictionary rows by id. */
export function makeApplyLookups(
  contents: Readonly<
    Pick<WorkspaceDictionaryContents, "dictionaries" | "entries" | "codeLists">
  >,
): ApplyLookups {
  return {
    dictionaryNames: new Map(
      contents.dictionaries.map((dictionary) => {
        return [dictionary.id, dictionary.name] as const;
      }),
    ),
    entries: new Map(
      contents.entries.map((entry) => {
        return [entry.id, entry] as const;
      }),
    ),
    codeLists: new Map(
      contents.codeLists.map((codeList) => {
        return [codeList.id, codeList] as const;
      }),
    ),
  };
}
