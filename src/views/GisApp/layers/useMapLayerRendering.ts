import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { createMapOverlayFromMapConfig } from "@/views/GisApp/layers/createMapOverlayFromMapConfig";
import { getQueryLayersFromMapLayers } from "@/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import { useMapLayersData } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import { useMapConfigWithPlaceIds } from "@/views/GisApp/places/useMapConfigWithPlaceIds";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/** Loaded layer data plus the renderable map specification. */
export type MapLayerRendering = AvaMapRender & {
  layerFeatureCollections: Map<MapLayer.Id, GeoJSON.FeatureCollection>;
};

/** Collects already-loaded spatial FeatureCollections, keyed by layer. */
function _getSpatialFeatureCollections(
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>,
): Map<MapLayer.Id, GeoJSON.FeatureCollection> {
  const collections = new Map<MapLayer.Id, GeoJSON.FeatureCollection>();
  layerQueryStates.forEach((state, layerId) => {
    if (state.data?.type === "spatial") {
      collections.set(layerId, state.data.featureCollection);
    }
  });
  return collections;
}

/**
 * Runs every layer's query and derives the map spec from the results. Places
 * layers also load `place_id`, exact layers query the extra columns their
 * popup and rings need, and displaced points are keyed by `jitterSalt`. The
 * GIS editor and the read-only map viewer both draw through this, so the
 * same map cannot render differently in the two places.
 */
export function useMapLayerRendering(
  options: Readonly<{
    mapConfig: AvaMapConfig.T;
    workspaceId: Workspace.Id;
    view: AvaMapConfig.ViewState;
    /** The map's secret displacement salt (`AvaMap.T["jitterSalt"]`). */
    jitterSalt: string;
    hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
  }>,
): MapLayerRendering {
  const [datasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", options.workspaceId),
  );
  const [datasetColumns = []] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", options.workspaceId),
  );
  const zoomBand = Math.max(0, Math.min(24, Math.floor(options.view.zoom)));
  const simplificationReferenceLatitude = useMemo(() => {
    return options.view.center[1];
    // Capture latitude only when a new integer zoom band begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomBand]);
  const renderedMapConfig = useMapConfigWithPlaceIds({
    mapConfig: options.mapConfig,
    workspaceId: options.workspaceId,
    datasetColumns,
  });
  const renderedLayers = renderedMapConfig.layers;
  const queryLayers = useMemo(() => {
    return getQueryLayersFromMapLayers(renderedLayers);
  }, [renderedLayers]);
  const layerQueryStates = useMapLayersData({
    layers: queryLayers,
    workspaceId: options.workspaceId,
    zoom: options.view.zoom,
    simplificationReferenceLatitude,
    datasets,
    datasetColumns,
    overlay: createMapOverlayFromMapConfig(options.mapConfig),
    jitterSalt: options.jitterSalt,
  });
  const rendering = useAvaMapRender({
    layerQueryStates,
    mapConfig: renderedMapConfig,
    hiddenAnnotationFeatureIds: options.hiddenAnnotationFeatureIds,
    jitterSalt: options.jitterSalt,
  });
  return {
    ...rendering,
    layerFeatureCollections: _getSpatialFeatureCollections(layerQueryStates),
  };
}
