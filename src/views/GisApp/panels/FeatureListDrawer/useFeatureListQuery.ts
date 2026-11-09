import { useQuery } from "@avandar/query-hooks";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { fetchMapLayerFeatureCount } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureCount/fetchMapLayerFeatureCount";
import { fetchMapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { getFeatureListQueryKey } from "@/views/GisApp/panels/FeatureListDrawer/getFeatureListQueryKey/getFeatureListQueryKey";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListAccess,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

/** What the feature list drawer shows for one layer. */
export type FeatureListQueryState = {
  access: MapLayerFeatureListAccess;
  list: MapLayerFeatureList | undefined;
  count: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

type WorkspaceColumnMetadata = {
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

/** The workspace's datasets and columns, once both have loaded. */
function useWorkspaceColumnMetadata(
  workspaceId: Workspace.Id,
): WorkspaceColumnMetadata | undefined {
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [datasetColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  return datasets && datasetColumns ? { datasets, datasetColumns } : undefined;
}

type FeatureListQueryInputs = {
  config: AvaMapConfig.T;
  layerId: MapLayer.Id | undefined;
  workspaceId: Workspace.Id;
  metadata: WorkspaceColumnMetadata | undefined;
  /**
   * The parts of the map that change the list, from
   * `getFeatureListQueryKey`. The whole config is not keyed, so panning,
   * zooming, or restyling another layer does not refetch. The workspace
   * metadata is not keyed either, since a column change already shows up in
   * the listed layers' sources.
   */
  keyParts: readonly unknown[];
};

/** Every row of an exact layer's feature list, when `isEnabled`. */
function useFeatureListRows(
  inputs: Readonly<FeatureListQueryInputs & { isEnabled: boolean }>,
): UseQueryResultTuple<MapLayerFeatureList> {
  const { i18n } = useLingui();
  const { config, layerId, workspaceId, metadata } = inputs;
  return useQuery({
    enabled: inputs.isEnabled && metadata !== undefined,
    // `keyParts` names exactly the inputs that change the result.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["mapLayerFeatureList", ...inputs.keyParts, i18n.locale],
    queryFn: async ({ signal }) => {
      if (!layerId || !metadata) {
        throw new Error("The feature list layer is not ready");
      }
      return await fetchMapLayerFeatureList({
        config,
        layerId,
        columnIds: "popup",
        sort: undefined,
        limit: undefined,
        workspaceId,
        datasets: metadata.datasets,
        datasetColumns: metadata.datasetColumns,
        i18n,
        signal,
      });
    },
  });
}

/** How many features a jittered layer has, when `isEnabled`. */
function useFeatureCount(
  inputs: Readonly<FeatureListQueryInputs & { isEnabled: boolean }>,
): UseQueryResultTuple<number> {
  const { config, layerId, workspaceId, metadata } = inputs;
  return useQuery({
    enabled: inputs.isEnabled && metadata !== undefined,
    // `keyParts` names exactly the inputs that change the result.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["mapLayerFeatureCount", ...inputs.keyParts],
    queryFn: async ({ signal }) => {
      if (!layerId || !metadata) {
        throw new Error("The feature list layer is not ready");
      }
      return await fetchMapLayerFeatureCount({
        config,
        layerId,
        workspaceId,
        datasets: metadata.datasets,
        datasetColumns: metadata.datasetColumns,
        signal,
      });
    },
  });
}

/**
 * Loads what the feature list drawer may show for `layer`: every row for an
 * exact layer, or only a count for a jittered one. Read by
 * `FeatureListDrawer`; it refetches only when the listed layer, a layer its
 * spatial filter reads, or the map's area or time window changes.
 */
export function useFeatureListQuery(
  options: Readonly<{
    config: AvaMapConfig.T;
    layer: MapLayer.T | undefined;
    workspaceId: Workspace.Id;
  }>,
): FeatureListQueryState {
  const { config, workspaceId } = options;
  const metadata = useWorkspaceColumnMetadata(workspaceId);
  const layerId = options.layer?.id;
  const access = options.layer
    ? getFeatureListAccessFromMapLayer(options.layer)
    : "unavailable";
  const inputs = {
    config,
    layerId,
    workspaceId,
    metadata,
    keyParts: [
      workspaceId,
      layerId,
      ...getFeatureListQueryKey({ config, layer: options.layer }),
    ],
  };
  const [list, isListLoading, listQuery] = useFeatureListRows({
    ...inputs,
    isEnabled: access === "rows",
  });
  const [count, isCountLoading, countQuery] = useFeatureCount({
    ...inputs,
    isEnabled: access === "countOnly",
  });
  return {
    access,
    list,
    count,
    isLoading: isListLoading || isCountLoading,
    error: listQuery.error ?? countQuery.error ?? undefined,
  };
}
