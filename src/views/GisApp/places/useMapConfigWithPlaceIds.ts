import { useMemo } from "react";
import { VirtualPlacesStore as PlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { useKnownPlacesDatasetIds } from "@/views/GisApp/places/useKnownPlacesDatasetIds";
import { withPlaceIdColumn } from "@/views/GisApp/places/withPlaceIdColumn/withPlaceIdColumn";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * The map config the GIS app loads and draws: the saved config, with every
 * places layer also carrying `place_id` on its features (see
 * `withPlaceIdColumn`). Never saved back.
 */
export function useMapConfigWithPlaceIds(
  options: Readonly<{
    mapConfig: AvaMapConfig.T;
    workspaceId: Workspace.Id;
    datasetColumns: readonly DatasetColumn.T[];
  }>,
): AvaMapConfig.T {
  const { mapConfig, datasetColumns } = options;
  const placesDatasetIds = useKnownPlacesDatasetIds(
    PlacesStore.usePlacesDatasetIds(options.workspaceId),
  );
  return useMemo(() => {
    const layers = mapConfig.layers.map((layer) => {
      return withPlaceIdColumn({ layer, placesDatasetIds, datasetColumns });
    });
    const isUnchanged = layers.every((layer, layerIdx) => {
      return layer === mapConfig.layers[layerIdx];
    });
    return isUnchanged ? mapConfig : { ...mapConfig, layers };
  }, [mapConfig, placesDatasetIds, datasetColumns]);
}
