import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { WorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";

/** Everything the apply flow reads before matching. */
export type ApplyDictionariesData = WorkspaceDictionaryContents & {
  dataset: Dataset.T | undefined;
  /**
   * In the dataset's column order, without keep-original copies. Undefined
   * while loading.
   */
  columns: readonly DatasetColumn.T[] | undefined;
  existingBindings: readonly DictionaryBinding.T[];
  /** Every entry of every dictionary, ready to match. */
  matchEntries: readonly DictionaryMatch.Entry[];
};

const NO_BINDINGS: readonly DictionaryBinding.T[] = [];

/** One dataset, its columns in order, and its bindings. */
function useDatasetWithBindings(datasetId: Dataset.Id): {
  dataset: Dataset.T | undefined;
  columns: readonly DatasetColumn.T[] | undefined;
  existingBindings: readonly DictionaryBinding.T[];
  isLoading: boolean;
  hasLoadFailed: boolean;
} {
  const ofDataset = {
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [dataset, , datasetQuery] = DatasetClient.useGetById({ id: datasetId });
  const [columns, , columnsQuery] = DatasetColumnClient.useGetAll(ofDataset);
  const [bindings, , bindingsQuery] =
    DictionaryBindingClient.useGetAll(ofDataset);
  const sortedColumns = useMemo(() => {
    // A `<column>_original` copy is part of its column's conversion, not a
    // column to apply a dictionary to.
    return columns
      ?.filter((column) => {
        return column.dictionaryBindingId === undefined;
      })
      .sort((columnA, columnB) => {
        return columnA.columnIdx - columnB.columnIdx;
      });
  }, [columns]);
  return {
    dataset,
    columns: sortedColumns,
    existingBindings: bindings ?? NO_BINDINGS,
    isLoading: !dataset || !columns || !bindings,
    hasLoadFailed: [datasetQuery, columnsQuery, bindingsQuery].some((query) => {
      return query.isLoadingError;
    }),
  };
}

/** Every entry of every dictionary, ready to match, built once per change. */
function useMatchEntries(
  contents: Readonly<WorkspaceDictionaryContents>,
): readonly DictionaryMatch.Entry[] {
  const { dictionaries, entries, codeLists, codings } = contents;
  return useMemo(() => {
    return DictionaryMatch.toMatchEntries({
      dictionaries,
      entries,
      codeLists,
      codings,
    });
  }, [dictionaries, entries, codeLists, codings]);
}

/**
 * Loads one dataset, its columns, its current bindings, and every
 * dictionary in the workspace, for the apply flow. Bindings refetch on
 * mount, since this flow is what changes them. The result is one object
 * per change of what it holds, so the flow's memos and its first-selection
 * effect do not rerun on every render.
 */
export function useApplyDictionariesData(
  datasetId: Dataset.Id,
): ApplyDictionariesData {
  const workspace = useCurrentWorkspace();
  const own = useDatasetWithBindings(datasetId);
  const contents = useWorkspaceDictionaryContents(workspace.id);
  const { dictionaries, entries, codeLists, codings } = contents;
  const matchEntries = useMatchEntries(contents);
  const { dataset, columns, existingBindings } = own;
  const isLoading = contents.isLoading || own.isLoading;
  const hasLoadFailed = contents.hasLoadFailed || own.hasLoadFailed;
  return useMemo(() => {
    return {
      dictionaries,
      entries,
      codeLists,
      codings,
      matchEntries,
      dataset,
      columns,
      existingBindings,
      isLoading,
      hasLoadFailed,
    };
  }, [
    dictionaries,
    entries,
    codeLists,
    codings,
    matchEntries,
    dataset,
    columns,
    existingBindings,
    isLoading,
    hasLoadFailed,
  ]);
}
