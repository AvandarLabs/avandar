import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

/**
 * Whether a combined dataset is behind its code lists: a list it embedded
 * is gone (or no longer readable), or its pairs no longer give the
 * fingerprint recorded when it was combined. Used by the crosswalk's stale
 * banner and by the dictionary's Used by tab.
 */
export function isCrosswalkStale(
  options: Readonly<{
    compiledCodeLists: readonly Crosswalk.CompiledCodeList[];
    /** The embedded lists as they are now, as far as the user can read them. */
    codeLists: ReadonlyArray<Pick<DataDictionaryCodeList.T, "id" | "pairs">>;
  }>,
): boolean {
  const pairsById = new Map(
    options.codeLists.map((codeList) => {
      return [codeList.id as string, codeList.pairs] as const;
    }),
  );
  return options.compiledCodeLists.some((compiled) => {
    const pairs = pairsById.get(compiled.codeListId);
    return (
      pairs === undefined ||
      CrosswalkSql.getCodeListFingerprint(pairs) !== compiled.fingerprint
    );
  });
}
