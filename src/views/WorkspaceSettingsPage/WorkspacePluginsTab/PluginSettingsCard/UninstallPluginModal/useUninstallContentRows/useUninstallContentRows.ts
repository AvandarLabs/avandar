import { useQueries } from "@tanstack/react-query";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { UserClient } from "@/clients/UserClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

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
};

/**
 * Whether the user may delete each dataset, by the same rule as the
 * `datasets` DELETE policy. A failed check reads as not allowed.
 */
function useCanDeleteByDatasetId(datasetIds: readonly Dataset.Id[]): {
  canDeleteById: ReadonlyMap<Dataset.Id, boolean>;
  isLoading: boolean;
} {
  const results = useQueries({
    queries: datasetIds.map((datasetId) => {
      return {
        queryKey: ["plugins", "uninstall", "canDeleteDataset", datasetId],
        queryFn: () => {
          return UserClient.canAccessResource({
            resourceType: "dataset",
            resourceId: datasetId,
            minRole: "admin",
          });
        },
        // An access answer must be asked again each time the modal opens.
        // `persist: false` keeps it out of the IndexedDB cache, and a zero
        // `gcTime` drops it from memory once the modal closes.
        staleTime: 0,
        gcTime: 0,
        meta: { persist: false },
      };
    }),
  });
  return {
    canDeleteById: new Map(
      datasetIds.map((datasetId, index) => {
        return [datasetId, results[index]?.data === true];
      }),
    ),
    isLoading: results.some((result) => {
      return result.isLoading;
    }),
  };
}

/**
 * The datasets a plugin imported into the current workspace, named as they
 * are now, with whether the current user may delete each one. Imports whose
 * dataset the user cannot read are only counted. Use it where a plugin's
 * imported content is listed for an admin to keep or delete, such as an
 * uninstall dialog.
 */
export function useUninstallContentRows(
  pluginId: string,
): UninstallContentRows {
  const imported = useImportedPluginContent(pluginId);
  const importedIds = Object.values(imported.importsByContentId).map(
    (contentImport) => {
      return contentImport.datasetId;
    },
  );
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    where: { id: { in: importedIds } },
    useQueryOptions: {
      ...ALWAYS_REFETCH_ON_MOUNT,
      enabled: importedIds.length > 0,
    },
  });
  const readable = datasets ?? [];
  const access = useCanDeleteByDatasetId(
    readable.map((dataset) => {
      return dataset.id;
    }),
  );
  return {
    rows: readable
      .map((dataset) => {
        return {
          datasetId: dataset.id,
          name: dataset.name,
          canDelete: access.canDeleteById.get(dataset.id) === true,
        };
      })
      .sort((left, right) => {
        return left.name.localeCompare(right.name);
      }),
    hiddenCount: importedIds.length - readable.length,
    isLoading: imported.isLoading || isLoadingDatasets || access.isLoading,
  };
}
