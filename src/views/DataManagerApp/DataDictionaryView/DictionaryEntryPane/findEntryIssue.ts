import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

/** The first issue of one of `types` that is about the entry, if any. */
export function findEntryIssue(
  options: Readonly<{
    issues: readonly DataDictionary.DraftIssue[];
    entryId: DataDictionaryEntry.Id;
    types: ReadonlyArray<DataDictionary.DraftIssue["type"]>;
  }>,
): DataDictionary.DraftIssue | undefined {
  const { issues, entryId, types } = options;
  return issues.find((issue) => {
    return (
      "entryId" in issue &&
      issue.entryId === entryId &&
      types.includes(issue.type)
    );
  });
}
