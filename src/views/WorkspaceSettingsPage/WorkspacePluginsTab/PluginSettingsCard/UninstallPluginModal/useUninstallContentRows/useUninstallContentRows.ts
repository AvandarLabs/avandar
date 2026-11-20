import { useQueries } from "@tanstack/react-query";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { UserClient } from "@/clients/UserClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";
import { useLookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";

/** One imported dataset as the uninstall modal lists it. */
export type UninstallContentRow = {
  datasetId: Dataset.Id;

  /** The dataset's current name, which may differ after a rename. */
  name: string;

  /** Whether the current user may delete the dataset. */
  canDelete: boolean;
};

/** The datasets a plugin imported, as the uninstall modal lists them. */
export type UninstallContentRows = {
  rows: UninstallContentRow[];

  /** Imports whose dataset the current user cannot read. */
  hiddenCount: number;
  isLoading: boolean;

  /**
   * True when a lookup behind the list failed: the imports, the datasets, or
   * an access check. `rows` is then empty and `hiddenCount` is 0, since
   * nothing loaded can be trusted. The caller says so and keeps every
   * dataset instead of listing any.
   */
  hasFailed: boolean;

  /**
   * True while a retry of a failed lookup is in flight. `hasFailed` is false
   * then, `rows` is still empty, and `isLoading` is true.
   */
  isRetrying: boolean;

  /** Asks again for whatever failed. `isLoading` is true until it settles. */
  retry: () => void;
};

/**
 * The query that asks whether the user may delete one dataset. The answer is
 * asked again each time the modal opens: `persist: false` keeps it out of
 * the IndexedDB cache, and a zero `gcTime` drops it from memory once the
 * modal closes.
 */
function _createAccessQuery(datasetId: Dataset.Id) {
  return {
    queryKey: ["plugins", "uninstall", "canDeleteDataset", datasetId],
    queryFn: () => {
      return UserClient.canAccessResource({
        resourceType: "dataset",
        resourceId: datasetId,
        minRole: "admin",
      });
    },
    staleTime: 0,
    gcTime: 0,
    meta: { persist: false },
  };
}

/**
 * Whether the user may delete each dataset, by the same rule as the
 * `datasets` DELETE policy. A check that failed is not read as "not allowed":
 * it is reported through `hasFailed`, and `retry` asks the failed ones again.
 *
 * Called only by `useUninstallContentRows`, which lists the result.
 */
function useCanDeleteByDatasetId(datasetIds: readonly Dataset.Id[]): {
  canDeleteById: ReadonlyMap<Dataset.Id, boolean>;
  isLoading: boolean;
  hasFailed: boolean;
  retry: () => void;
} {
  const results = useQueries({ queries: datasetIds.map(_createAccessQuery) });
  const failedResults = results.filter((result) => {
    return result.isError && !result.isFetching;
  });
  return {
    canDeleteById: new Map(
      datasetIds.map((datasetId, index) => {
        return [datasetId, results[index]?.data === true];
      }),
    ),
    isLoading: results.some((result) => {
      return result.isLoading || (result.isError && result.isFetching);
    }),
    hasFailed: failedResults.length > 0,
    retry: () => {
      failedResults.forEach((result) => {
        void result.refetch();
      });
    },
  };
}

/** The rows for the readable datasets, sorted by name. */
function _createRowsFromDatasets(
  datasets: ReadonlyArray<{ id: Dataset.Id; name: string }>,
  canDeleteById: ReadonlyMap<Dataset.Id, boolean>,
): UninstallContentRow[] {
  return datasets
    .map((dataset) => {
      return {
        datasetId: dataset.id,
        name: dataset.name,
        canDelete: canDeleteById.get(dataset.id) === true,
      };
    })
    .sort((left, right) => {
      return left.name.localeCompare(right.name);
    });
}

/**
 * The ids of the datasets the plugin imported. A restored imports list may be
 * stale while it refetches, and after a failed lookup it cannot be trusted,
 * so none of it is asked about then.
 */
function _listTrustedDatasetIds(imported: ImportedPluginContent): Dataset.Id[] {
  if (imported.isFetching || imported.isError) {
    return [];
  }
  return Object.values(imported.importsByContentId).map((contentImport) => {
    return contentImport.datasetId;
  });
}

/**
 * The imported datasets the user can read, loaded by id. It lists nothing
 * while the lookup is in flight or after it failed, since a restored cache
 * can hold a list that names a deleted dataset or hides a new one.
 *
 * Called only by `useUninstallContentRows`.
 */
function useReadableDatasets(importedIds: readonly Dataset.Id[]): {
  readable: ReadonlyArray<{ id: Dataset.Id; name: string }>;
  isFetching: boolean;
  hasFailed: boolean;
  retry: () => void;
} {
  const hasImports = importedIds.length > 0;
  const [datasets, , query] = DatasetClient.useGetAll({
    where: { id: { in: [...importedIds] } },
    useQueryOptions: { ...ALWAYS_REFETCH_ON_MOUNT, enabled: hasImports },
  });
  const isFetching = hasImports && query.isFetching;
  const hasFailed = hasImports && query.isError && !query.isFetching;
  return {
    readable: hasImports && !isFetching && !hasFailed ? (datasets ?? []) : [],
    isFetching,
    hasFailed,
    retry: () => {
      if (hasFailed) {
        void query.refetch();
      }
    },
  };
}

/**
 * The datasets a plugin imported into the current workspace, named as they
 * are now, with whether the current user may delete each one. Imports whose
 * dataset the user cannot read are only counted. While any lookup is in
 * flight it lists nothing. When one fails, it reports `hasFailed` and lists
 * nothing, so a failure is never shown as a dataset the user cannot see.
 *
 * `UninstallPluginModal` uses it to list the imported datasets an admin can
 * choose to keep or delete.
 */
export function useUninstallContentRows(
  pluginId: string,
): UninstallContentRows {
  const imported = useImportedPluginContent(pluginId);
  const importedIds = _listTrustedDatasetIds(imported);
  const datasets = useReadableDatasets(importedIds);
  const access = useCanDeleteByDatasetId(
    datasets.readable.map((dataset) => {
      return dataset.id;
    }),
  );
  const hasFailed =
    imported.hasFailed || datasets.hasFailed || access.hasFailed;
  const isLoading =
    imported.isLoading ||
    imported.isFetching ||
    datasets.isFetching ||
    access.isLoading;
  // A failure shown to the admin must stay until its retry settles.
  const lookupState = useLookupState({ hasFailed, isLoading });
  const canList = lookupState === "ok" && !datasets.isFetching;
  return {
    rows: canList
      ? _createRowsFromDatasets(datasets.readable, access.canDeleteById)
      : [],
    hiddenCount: canList ? importedIds.length - datasets.readable.length : 0,
    isLoading,
    hasFailed,
    isRetrying: lookupState === "retrying",
    retry: () => {
      if (imported.hasFailed) {
        imported.refetch();
      }
      datasets.retry();
      access.retry();
    },
  };
}
