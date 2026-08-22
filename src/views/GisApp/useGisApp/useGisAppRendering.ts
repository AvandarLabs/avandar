import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { GisAppChrome } from "@/views/GisApp/useGisApp/useGisAppChrome";

import { where } from "@avandar/utils";
import { useMemo } from "react";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { FitBoundsRequest } from "@/views/GisApp/layers/FitBoundsRequest/FitBoundsRequest";
import { PersistedLayerLegends } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import { useMapLayersData } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";

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

/** Loaded layer data plus the renderable map specification. */
export type GisAppRendering = ReturnType<typeof useAvaMapRender> & {
  layerFeatureCollections: Map<MapLayer.Id, GeoJSON.FeatureCollection>;
};

/** Loads layer data and derives the renderable map state from it. */
export function useGisAppRendering(
  options: Readonly<{
    avaMap: AvaMap.T;
    chrome: GisAppChrome;
    editor: ReturnType<typeof useAvaMapEditor>;
    hiddenAnnotationFeatureIds?: readonly AvaMapConfig.AnnotationFeatureId[];
  }>,
): GisAppRendering {
  const [datasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", options.avaMap.workspaceId),
  );
  const [datasetColumns = []] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", options.avaMap.workspaceId),
  );
  const zoomBand = Math.max(
    0,
    Math.min(24, Math.floor(options.editor.mapConfig.view.zoom)),
  );
  const simplificationReferenceLatitude = useMemo(() => {
    return options.editor.mapConfig.view.center[1];
    // Capture latitude only when a new integer zoom band begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomBand]);
  const layerQueryStates = useMapLayersData({
    layers: options.editor.mapConfig.layers,
    workspaceId: options.avaMap.workspaceId,
    zoom: options.editor.mapConfig.view.zoom,
    simplificationReferenceLatitude,
    datasets,
    datasetColumns,
    overlay: {
      aoi: options.editor.mapConfig.aoi,
      timeRange: options.editor.mapConfig.timeRange,
    },
  });
  const rendering = useAvaMapRender({
    layerQueryStates,
    mapConfig: options.editor.mapConfig,
    hiddenAnnotationFeatureIds: options.hiddenAnnotationFeatureIds,
  });
  PersistedLayerLegends.usePersistedLayerLegends({
    mapConfig: options.editor.mapConfig,
    legendUpdates: rendering.legendUpdates,
    updateConfig: options.editor.updateConfig,
  });
  FitBoundsRequest.useAutoFitNewLayers({
    layerBounds: rendering.layerBounds,
    requestFitBounds: options.chrome.requestFitBounds,
  });

  return {
    ...rendering,
    layerFeatureCollections: _getSpatialFeatureCollections(layerQueryStates),
  };
}
