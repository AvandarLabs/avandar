import { prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { isCrosswalkStale } from "@/lib/crosswalks/isCrosswalkStale/isCrosswalkStale";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

/** Whether a crosswalk's combined dataset is behind its code lists. */
export type CrosswalkStaleness = {
  isStale: boolean;
  isLoading: boolean;
};

const NO_COMPILED_CODE_LISTS: readonly Crosswalk.CompiledCodeList[] = [];

/**
 * Reads the code lists a crosswalk's combined dataset embedded and says
 * whether any is gone or changed since it was combined. Nothing is stale
 * without a crosswalk, before it was combined, or while the lists are
 * loading or failed to load.
 */
export function useCrosswalkStaleness(
  crosswalk: Crosswalk.T | undefined,
): CrosswalkStaleness {
  const compiledCodeLists =
    crosswalk?.compiledCodeLists ?? NO_COMPILED_CODE_LISTS;
  const codeListIds = useMemo(() => {
    return compiledCodeLists.map(prop("codeListId"));
  }, [compiledCodeLists]);
  const hasCodeLists = codeListIds.length > 0;
  const [codeLists, isLoading] = DataDictionaryCodeListClient.useGetAll({
    ...where("id", "in", codeListIds),
    useQueryOptions: { enabled: hasCodeLists },
  });
  const isStale = useMemo(() => {
    return (
      hasCodeLists &&
      codeLists !== undefined &&
      isCrosswalkStale({ compiledCodeLists, codeLists })
    );
  }, [hasCodeLists, codeLists, compiledCodeLists]);
  return { isStale, isLoading };
}
