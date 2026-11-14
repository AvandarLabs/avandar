import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceDictionaryContents } from "@/views/DataManagerApp/ApplyDictionariesView/useWorkspaceDictionaryContents";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

/** Everything a crosswalk matches against, and the bindings of its datasets. */
export type CrosswalkCatalog = {
  context: CrosswalkContext;
  /** The bindings of the datasets asked for, by dataset id. */
  bindingsByDatasetId: ReadonlyMap<string, readonly DictionaryBinding.T[]>;
  /** Every dataset column's name, by its id, to read bindings by name. */
  columnNameById: ReadonlyMap<string, string>;
  isLoading: boolean;
};

const ID_SEPARATOR = "\u001f";

function _toLayoutDatasets(
  datasets: readonly Dataset.T[],
  columns: readonly DatasetColumn.T[],
): Map<string, CrosswalkLayout.Dataset> {
  const columnsByDatasetId = new Map<string, DatasetColumn.T[]>();
  columns.forEach((column) => {
    columnsByDatasetId.set(column.datasetId, [
      ...(columnsByDatasetId.get(column.datasetId) ?? []),
      column,
    ]);
  });
  return new Map(
    datasets.map((dataset) => {
      const ordered = [...(columnsByDatasetId.get(dataset.id) ?? [])].sort(
        (columnA, columnB) => {
          return columnA.columnIdx - columnB.columnIdx;
        },
      );
      const layoutColumns = ordered.map((column) => {
        return { name: column.name, dataType: column.dataType };
      });
      return [
        dataset.id,
        { id: dataset.id, name: dataset.name, columns: layoutColumns },
      ];
    }),
  );
}

/** Every dataset the user can read with its columns, and column names. */
function useWorkspaceDatasets(workspaceId: Workspace.Id) {
  const inWorkspace = {
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  };
  const [datasets] = DatasetClient.useGetAll(inWorkspace);
  const [columns] = DatasetColumnClient.useGetAll(inWorkspace);
  const datasetsById = useMemo(() => {
    return _toLayoutDatasets(datasets ?? [], columns ?? []);
  }, [datasets, columns]);
  const columnNameById = useMemo(() => {
    return new Map(
      (columns ?? []).map((column) => {
        return [column.id as string, column.name];
      }),
    );
  }, [columns]);
  return { datasetsById, columnNameById, isLoading: !datasets || !columns };
}

/** The bindings of `datasetIds`, by dataset id. */
function useBindingsByDatasetId(
  workspaceId: Workspace.Id,
  datasetIds: readonly Dataset.Id[],
) {
  const [bindings] = DictionaryBindingClient.useGetAll({
    ...where("workspace_id", "eq", workspaceId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  // A key, so a new array holding the same ids does not rebuild the map.
  const datasetIdKey = [...datasetIds].sort().join(ID_SEPARATOR);
  const bindingsByDatasetId = useMemo(() => {
    const wanted = new Set(datasetIdKey.split(ID_SEPARATOR));
    const byDataset = new Map<string, DictionaryBinding.T[]>();
    (bindings ?? []).forEach((binding) => {
      if (wanted.has(binding.datasetId)) {
        byDataset.set(binding.datasetId, [
          ...(byDataset.get(binding.datasetId) ?? []),
          binding,
        ]);
      }
    });
    return byDataset;
  }, [bindings, datasetIdKey]);
  return { bindingsByDatasetId, isLoading: !bindings };
}

/**
 * Loads what a crosswalk is matched against: every dataset the user can
 * read with its columns, every dictionary entry ready to match (primary
 * code list first), and the bindings of `datasetIds`, which seeding reads
 * from the reference dataset. Every query refetches on mount, so a dataset
 * imported or a dictionary edited a moment ago is used.
 */
export function useCrosswalkCatalog(
  datasetIds: readonly Dataset.Id[],
): CrosswalkCatalog {
  const workspace = useCurrentWorkspace();
  const datasets = useWorkspaceDatasets(workspace.id);
  const bindings = useBindingsByDatasetId(workspace.id, datasetIds);
  const contents = useWorkspaceDictionaryContents(workspace.id);
  const { dictionaries, entries, codeLists, codings } = contents;
  const entriesById = useMemo(() => {
    const matchEntries = DictionaryMatch.toMatchEntries({
      dictionaries,
      entries,
      codeLists,
      codings,
    });
    return new Map(
      matchEntries.map((entry) => {
        return [entry.entryId as string, entry];
      }),
    );
  }, [dictionaries, entries, codeLists, codings]);
  const { datasetsById } = datasets;
  const context = useMemo(() => {
    return { datasetsById, entriesById };
  }, [datasetsById, entriesById]);
  return {
    context,
    bindingsByDatasetId: bindings.bindingsByDatasetId,
    columnNameById: datasets.columnNameById,
    isLoading: datasets.isLoading || bindings.isLoading || contents.isLoading,
  };
}
