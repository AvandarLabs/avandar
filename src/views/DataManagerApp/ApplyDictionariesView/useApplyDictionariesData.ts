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
  /** Sorted by the dataset's column order. Undefined while loading. */
  columns: readonly DatasetColumn.T[] | undefined;
  existingBindings: readonly DictionaryBinding.T[];
  /** Every entry of every dictionary, ready to match. */
  matchEntries: readonly DictionaryMatch.Entry[];
};

/**
 * Loads one dataset, its columns, its current bindings, and every
 * dictionary in the workspace, for the apply flow. Bindings refetch on
 * mount, since this flow is what changes them.
 */
export function useApplyDictionariesData(
  datasetId: Dataset.Id,
): ApplyDictionariesData {
  const workspace = useCurrentWorkspace();
  const ofDataset = {
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [dataset, , datasetQuery] = DatasetClient.useGetById({ id: datasetId });
  const [columns, , columnsQuery] = DatasetColumnClient.useGetAll(ofDataset);
  const [bindings, , bindingsQuery] =
    DictionaryBindingClient.useGetAll(ofDataset);
  const contents = useWorkspaceDictionaryContents(workspace.id);
  const sortedColumns = useMemo(() => {
    return columns
      ? [...columns].sort((columnA, columnB) => {
          return columnA.columnIdx - columnB.columnIdx;
        })
      : undefined;
  }, [columns]);
  const { dictionaries, entries, codeLists, codings } = contents;
  const matchEntries = useMemo(() => {
    return DictionaryMatch.toMatchEntries({
      dictionaries,
      entries,
      codeLists,
      codings,
    });
  }, [dictionaries, entries, codeLists, codings]);
  const ownQueries = [datasetQuery, columnsQuery, bindingsQuery];
  return {
    ...contents,
    dataset,
    columns: sortedColumns,
    existingBindings: bindings ?? [],
    matchEntries,
    isLoading: contents.isLoading || !dataset || !columns || !bindings,
    hasLoadFailed:
      contents.hasLoadFailed ||
      ownQueries.some((query) => {
        return query.isLoadingError;
      }),
  };
}
