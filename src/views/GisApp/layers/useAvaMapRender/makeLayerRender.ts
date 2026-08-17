import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { classifyLayerGeometry } from "@/views/GisApp/layers/useAvaMapRender/classifyLayerGeometry";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import { makeLayerViewState } from "@/views/GisApp/layers/useAvaMapRender/makeLayerViewState";
import type {
  createLayerGeometryCache,
  LayerGeometry,
} from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";

type LayerRender = {
  layerId: MapLayer.Id;
  layerSpec: MapSpec | undefined;
  interactiveLayerIds: string[];
  viewState: MapLayerViewState;
  bounds: MapBounds | undefined;
  legendUpdate: LayerLegendUpdate | undefined;
};

function _makeRenderedLayerSpec(
  options: Readonly<{
    layer: MapLayer.T;
    geometry: LayerGeometry;
    isRendered: boolean;
  }>,
): MapSpec | undefined {
  const { layer, geometry, isRendered } = options;
  if (!isRendered) {
    return undefined;
  }
  const valueColumnName = getPaintValueColumnName(layer);
  return makeLayerSpecFromMapLayer({
    layer,
    featureCollection: geometry.featureCollection,
    stats: getLayerStatsFromFeatureCollection({
      featureCollection: geometry.featureCollection,
      valueColumnName,
    }),
    valueColumnName,
  });
}

/** Gets the hit-testable MapLibre ids produced by a rendered map layer. */
function _getInteractiveLayerIds(options: {
  layer: MapLayer.T;
  isRendered: boolean;
}): string[] {
  const { layer, isRendered } = options;
  if (!isRendered || layer.symbology.type === "heatmap") {
    return [];
  }
  if (layer.symbology.type === "cluster") {
    return [
      MapLayerIds.toLayerId(layer.id),
      MapLayerIds.getUnclusteredLayerIdFromLayerId(layer.id),
    ];
  }
  return [MapLayerIds.toLayerId(layer.id)];
}

/** Selects direct spatial GeoJSON or cached row conversion. */
function _getLayerGeometry(options: {
  layer: MapLayer.T;
  binding: MapLayer.GeoBindingColumnNames | undefined;
  queryState: MapLayerQueryState | undefined;
  geometryCache: ReturnType<typeof createLayerGeometryCache>;
}): LayerGeometry {
  if (options.queryState?.data?.type === "spatial") {
    return {
      featureCollection: options.queryState.data.featureCollection,
      drops: [],
      error: undefined,
    };
  }
  return options.geometryCache.get({
    layerId: options.layer.id,
    binding: options.binding,
    sensitivity: options.layer.sensitivity,
    propertyColumnNames: MapLayer.toPopupColumnNames(options.layer),
    rows:
      options.queryState?.data?.type === "rows" ?
        options.queryState.data.queryResult.data
      : undefined,
  });
}

/** Derives all rendering state for one configured map layer. */
export function makeLayerRender({
  layer,
  layerQueryStates,
  geometryCache,
}: Readonly<{
  layer: MapLayer.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
  geometryCache: ReturnType<typeof createLayerGeometryCache>;
}>): LayerRender {
  const queryState = layerQueryStates.get(layer.id);
  const binding = MapLayer.toGeoBinding(layer);
  const rawGeometry = _getLayerGeometry({
    layer,
    binding,
    queryState,
    geometryCache,
  });
  const { geometry, legendUpdate } = classifyLayerGeometry({
    layer,
    geometry: rawGeometry,
    hasQueryData: queryState?.data !== undefined,
  });
  const viewState = makeLayerViewState({
    layer,
    hasBinding: layer.geoBinding !== undefined,
    geometry,
    queryState,
  });
  const isRendered = layer.isVisible && viewState.status === "ready";
  return {
    layerId: layer.id,
    layerSpec: _makeRenderedLayerSpec({ layer, geometry, isRendered }),
    interactiveLayerIds: _getInteractiveLayerIds({ layer, isRendered }),
    viewState,
    bounds: getBoundsFromFeatureCollection(geometry.featureCollection),
    legendUpdate,
  };
}
