import { where } from "@avandar/utils";
import { useMemo } from "react";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const NO_BINDINGS: DictionaryBinding.T[] = [];

/** What a dataset's attached dictionaries say about its columns. */
export type DatasetColumnCodes = {
  /** By dataset column id. */
  byColumnId: ReadonlyMap<string, ColumnCodes.T>;
  /** By column name, for views that only know a column's name. */
  byColumnName: ReadonlyMap<string, ColumnCodes.T>;
  isLoading: boolean;
};

type BoundDictionaryRows = Omit<ColumnCodes.Rows, "bindings"> & {
  isLoading: boolean;
};

/** The dictionaries, entries, and code lists a set of bindings names. */
function useBoundDictionaryRows(
  bindings: readonly DictionaryBinding.T[],
): BoundDictionaryRows {
  const ids = useMemo(() => {
    return ColumnCodes.getRowIdsFromBindings(bindings);
  }, [bindings]);
  const [dictionaries, isLoadingDictionaries] = DataDictionaryClient.useGetAll({
    ...where("id", "in", ids.dictionaryIds),
    useQueryOptions: {
      enabled: ids.dictionaryIds.length > 0,
      usePreviousDataAsPlaceholder: true,
    },
  });
  const [entries, isLoadingEntries] = DataDictionaryEntryClient.useGetAll({
    ...where("id", "in", ids.entryIds),
    useQueryOptions: {
      enabled: ids.entryIds.length > 0,
      usePreviousDataAsPlaceholder: true,
    },
  });
  const [codeLists, isLoadingCodeLists] =
    DataDictionaryCodeListClient.useGetAll({
      ...where("id", "in", ids.codeListIds),
      useQueryOptions: {
        enabled: ids.codeListIds.length > 0,
        usePreviousDataAsPlaceholder: true,
      },
    });
  const isLoading =
    isLoadingDictionaries || isLoadingEntries || isLoadingCodeLists;
  return useMemo(() => {
    return {
      dictionaries: dictionaries ?? [],
      entries: entries ?? [],
      codeLists: codeLists ?? [],
      isLoading,
    };
  }, [dictionaries, entries, codeLists, isLoading]);
}

/**
 * What the dictionaries attached to one dataset say about its columns: each
 * bound column's code list and description, read with the user's own
 * permissions. Bindings refetch on mount, so a dataset page opened right
 * after an apply shows it. Use it wherever a dataset's columns are listed,
 * for example its metadata or the Data Explorer's grid.
 */
export function useDatasetColumnCodes(
  options: Readonly<{
    datasetId: Dataset.Id | undefined;
    columns: ReadonlyArray<Pick<DatasetColumn.T, "id" | "name">> | undefined;
  }>,
): DatasetColumnCodes {
  const [bindings, isLoadingBindings] = DictionaryBindingClient.useGetAll({
    ...where("dataset_id", "eq", options.datasetId),
    useQueryOptions: {
      ...ALWAYS_REFETCH_ON_MOUNT,
      enabled: options.datasetId !== undefined,
    },
  });
  const boundBindings = bindings ?? NO_BINDINGS;
  const rows = useBoundDictionaryRows(boundBindings);
  const byColumnId = useMemo(() => {
    return ColumnCodes.fromRows({ ...rows, bindings: boundBindings });
  }, [rows, boundBindings]);
  const byColumnName = useMemo(() => {
    return new Map(
      (options.columns ?? []).flatMap((column) => {
        const codes = byColumnId.get(column.id);
        return codes ? [[column.name, codes] as const] : [];
      }),
    );
  }, [options.columns, byColumnId]);
  return {
    byColumnId,
    byColumnName,
    isLoading: isLoadingBindings || rows.isLoading,
  };
}
