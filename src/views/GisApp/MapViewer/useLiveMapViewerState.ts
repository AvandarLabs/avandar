import { prop, where } from "@avandar/utils";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { getDatasetIdsFromMapConfig } from "@/clients/maps/getDatasetIdsFromMapConfig/getDatasetIdsFromMapConfig";
import { VirtualPlacesStore } from "@/clients/places/VirtualPlacesStore/VirtualPlacesStore";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { useMapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import { mapViewerCameraToViewState } from "@/views/GisApp/MapViewer/mapViewerCameraToViewState/mapViewerCameraToViewState";
import { useHydratedMapConfig } from "@/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig";
import { useRequestSpatialExtension } from "@/views/GisApp/useRequestSpatialExtension/useRequestSpatialExtension";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { MapLayerRendering } from "@/views/GisApp/layers/useMapLayerRendering";
import type { MapViewerCamera } from "@/views/GisApp/MapViewer/MapViewer.types";

/** Whether the viewer can read every dataset the map's layers read. */
export type MapDatasetAccess = "loading" | "granted" | "denied";

/** Everything a live read-only map needs to draw. */
export type LiveMapViewerState = {
  config: AvaMapConfig.T;
  rendering: MapLayerRendering;
  initialView: AvaMapConfig.ViewState;
  onViewChange: (view: AvaMapConfig.ViewState) => void;
  placesDatasetIds: ReadonlySet<Dataset.Id>;
};

/**
 * Whether the viewer can read every dataset a map's layers read. A map is
 * drawn only once this is `granted`, so a viewer without access never sees
 * its layers flash or starts their queries.
 */
export function useMapDatasetAccess(avaMap: AvaMap.T): MapDatasetAccess {
  const [datasets, isLoading] = DatasetClient.useGetAll(
    where("workspace_id", "eq", avaMap.workspaceId),
  );
  if (isLoading || !datasets) {
    return "loading";
  }
  const readableIds = new Set(datasets.map(prop("id")));
  return getDatasetIdsFromMapConfig(avaMap.config).every((datasetId) => {
    return readableIds.has(datasetId);
  })
    ? "granted"
    : "denied";
}

/**
 * Hydrates and renders a live map exactly like the GIS app, keyed by the
 * map's own displacement salt, but keeps derived legends and camera moves in
 * memory: a viewer never writes to the map.
 */
export function useLiveMapViewerState(
  options: Readonly<{ avaMap: AvaMap.T; camera: MapViewerCamera }>,
): LiveMapViewerState {
  const { avaMap, camera } = options;
  useRequestSpatialExtension();
  const initialView = useMemo(() => {
    return mapViewerCameraToViewState({ camera, config: avaMap.config });
  }, [camera, avaMap.config]);
  const [currentView, setCurrentView] = useState(initialView);
  const hydration = useHydratedMapConfig({
    config: avaMap.config,
    workspaceId: avaMap.workspaceId,
  });
  const rendering = useMapLayerRendering({
    mapConfig: hydration.config,
    workspaceId: avaMap.workspaceId,
    view: currentView,
    jitterSalt: avaMap.jitterSalt,
  });
  const config = useMemo(() => {
    return PersistedLayerLegends.withLegendUpdates({
      mapConfig: hydration.config,
      legendUpdates: rendering.legendUpdates,
    });
  }, [hydration.config, rendering.legendUpdates]);
  return {
    config,
    rendering,
    initialView,
    onViewChange: setCurrentView,
    placesDatasetIds: VirtualPlacesStore.usePlacesDatasetIds(
      avaMap.workspaceId,
    ),
  };
}
