import type { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";

/**
 * The two maps a crosswalk fill is rendered with: the code lists of every
 * matchable entry by id, and each entry's primary list, which a translation
 * reconciles to. The primary list is an entry's first one, since
 * `DictionaryMatch.Entry` lists the primary first. An entry with no code
 * list has no primary. Use it wherever `CrosswalkSql` renders fills: the
 * combined dataset's compile and the side pane's example.
 */
export function buildCodeListLookups(
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>,
): CrosswalkSql.CodeLists {
  const entries = [...entriesById.values()];
  const codeListsById = new Map(
    entries.flatMap((entry) => {
      return entry.codeLists.map((codeList) => {
        return [codeList.id as string, { pairs: codeList.pairs }] as const;
      });
    }),
  );
  const primaryCodeListIdByEntryId = new Map(
    entries.flatMap((entry) => {
      const primaryList = entry.codeLists[0];
      return primaryList
        ? [[entry.entryId as string, primaryList.id as string] as const]
        : [];
    }),
  );
  return { codeListsById, primaryCodeListIdByEntryId };
}
