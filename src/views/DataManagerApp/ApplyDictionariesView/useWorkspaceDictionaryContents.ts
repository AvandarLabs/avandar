import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DataDictionaryEntryCodingClient } from "@/clients/dataDictionaries/DataDictionaryEntryCodingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Every dictionary in a workspace, with everything matching needs. */
export type WorkspaceDictionaryContents = {
  /** Sorted by name, then id, so the order never depends on the server. */
  dictionaries: readonly DataDictionary.T[];
  entries: readonly DataDictionaryEntry.T[];
  codeLists: readonly DataDictionaryCodeList.T[];
  codings: readonly DataDictionaryEntryCoding.T[];
  isLoading: boolean;
  hasLoadFailed: boolean;
};

// Stable empties, so a consumer's memo does not rerun while a query loads.
const NO_ENTRIES: readonly DataDictionaryEntry.T[] = [];
const NO_CODE_LISTS: readonly DataDictionaryCodeList.T[] = [];
const NO_CODINGS: readonly DataDictionaryEntryCoding.T[] = [];

function _compareDictionaries(
  dictionaryA: DataDictionary.T,
  dictionaryB: DataDictionary.T,
): number {
  const nameA = dictionaryA.name.toLowerCase();
  const nameB = dictionaryB.name.toLowerCase();
  if (nameA !== nameB) {
    return nameA < nameB ? -1 : 1;
  }
  return dictionaryA.id < dictionaryB.id ? -1 : 1;
}

/**
 * Loads every dictionary in the workspace with its entries, code lists, and
 * codings, for matching a dataset's columns against all of them. Each
 * query refetches on mount, so an edit made in another tab is used.
 */
export function useWorkspaceDictionaryContents(
  workspaceId: Workspace.Id,
): WorkspaceDictionaryContents {
  const inWorkspace = {
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [dictionaries, , dictionariesQuery] =
    DataDictionaryClient.useGetAll(inWorkspace);
  const [entries, , entriesQuery] =
    DataDictionaryEntryClient.useGetAll(inWorkspace);
  const [codeLists, , codeListsQuery] =
    DataDictionaryCodeListClient.useGetAll(inWorkspace);
  const [codings, , codingsQuery] =
    DataDictionaryEntryCodingClient.useGetAll(inWorkspace);
  const sorted = useMemo(() => {
    return [...(dictionaries ?? [])].sort(_compareDictionaries);
  }, [dictionaries]);
  const queries = [
    dictionariesQuery,
    entriesQuery,
    codeListsQuery,
    codingsQuery,
  ];
  return {
    dictionaries: sorted,
    entries: entries ?? NO_ENTRIES,
    codeLists: codeLists ?? NO_CODE_LISTS,
    codings: codings ?? NO_CODINGS,
    isLoading: !dictionaries || !entries || !codeLists || !codings,
    hasLoadFailed: queries.some((query) => {
      return query.isLoadingError;
    }),
  };
}
