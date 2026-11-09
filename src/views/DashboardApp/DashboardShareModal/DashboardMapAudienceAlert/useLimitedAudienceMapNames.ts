import { plural } from "@lingui/core/macro";
import { useMemo } from "react";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { getLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/getLimitedAudienceMapNames/getLimitedAudienceMapNames";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _getDatasetIdsFromMaps(maps: readonly AvaMap.T[]): Dataset.Id[] {
  return Array.from(
    new Set(
      maps.flatMap((avaMap) => {
        return getDatasetIdsFromMapConfig(avaMap.config);
      }),
    ),
  );
}

/**
 * Names of the dashboard's maps that some of its audience cannot open. The
 * maps the author cannot read are counted into one phrase, since their names
 * are hidden from the author.
 * Empty while the maps or their datasets are still loading, so the warning
 * never flashes for a map that turns out to be open.
 */
export function useLimitedAudienceMapNames(dashboard: Dashboard.T): string[] {
  const mapIds = useMemo(() => {
    return DashboardMapBlocks.getMapIds(dashboard.config);
  }, [dashboard.config]);
  const [maps = [], isLoadingMaps] = AvaMapClient.useGetAll({
    where: {
      id: { in: mapIds },
      workspace_id: { eq: dashboard.workspaceId },
    },
    useQueryOptions: { enabled: mapIds.length > 0 },
  });
  const datasetIds = useMemo(() => {
    return _getDatasetIdsFromMaps(maps);
  }, [maps]);
  const [datasets = [], isLoadingDatasets] = DatasetClient.useGetAll({
    where: {
      id: { in: datasetIds },
      workspace_id: { eq: dashboard.workspaceId },
    },
    useQueryOptions: { enabled: datasetIds.length > 0 },
  });
  if (isLoadingMaps || isLoadingDatasets) {
    return [];
  }
  const { mapNames, numUnavailableMaps } = getLimitedAudienceMapNames({
    mapIds,
    maps,
    datasets,
  });
  return numUnavailableMaps === 0
    ? mapNames
    : [
        ...mapNames,
        plural(numUnavailableMaps, {
          one: "a map you cannot open",
          other: "# maps you cannot open",
        }),
      ];
}
