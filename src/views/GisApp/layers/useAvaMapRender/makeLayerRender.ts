import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
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
import type { LayerLegendUpdate } from "@/views/GisApp/layers/PersistedLayerLegends/PersistedLayerLegends";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

type LayerRender = {
  layerId: MapLayer.Id;
  layerSpec: MapSpec | undefined;
  interactiveLayerIds: string[];
  viewState: MapLayerViewState;
  bounds: MapBounds | undefined;
  legendUpdate: LayerLegendUpdate | undefined;
  /** True when this layer actually draws a disputed or undetermined feature. */
  hasDrawnDisputedFeature: boolean;
};

function _makeRenderedLayerSpec(
  options: Readonly<{
    layer: MapLayer.T;
    geometry: LayerGeometry;
    isRendered: boolean;
    isAggregated: boolean;
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
    isAggregated: options.isAggregated,
  });
}

/**
 * The feature properties a layer's geometry must carry.
 *
 * An aggregated layer's cells are painted from the counts they carry, so those
 * columns have to survive the row-to-GeoJSON conversion even when the layer's
 * popup configuration names an explicit column list that cannot mention them.
 */
function _getPropertyColumnNames(options: {
  layer: MapLayer.T;
  isAggregated: boolean;
}): readonly string[] | "all" {
  const configured = MapLayer.toPropertyColumnNames(options.layer);
  if (!options.isAggregated || configured === "all") {
    return configured;
  }
  return [
    ...configured,
    PointAggregateProperties.pointCount,
    PointAggregateProperties.abbreviated,
  ];
}

/**
 * Gets the hit-testable MapLibre ids produced by a rendered map layer.
 *
 * A cluster-painted layer draws its groups and its lone points in two separate
 * paint layers, so both have to be hit-testable or a click on a single-row cell
 * would fall through to the basemap. That applies to an aggregated layer too,
 * whichever point symbology it was authored with.
 */
function _getInteractiveLayerIds(options: {
  layer: MapLayer.T;
  isRendered: boolean;
  isAggregated: boolean;
}): string[] {
  const { layer, isRendered } = options;
  if (!isRendered || layer.symbology.type === "heatmap") {
    return [];
  }
  if (layer.symbology.type === "cluster" || options.isAggregated) {
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
  isAggregated: boolean;
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
    propertyColumnNames: _getPropertyColumnNames(options),
    rows:
      options.queryState?.data?.type === "rows"
        ? options.queryState.data.queryResult.data
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
  const aggregation =
    queryState?.data?.type === "rows" ? queryState.data.aggregation : undefined;
  const isAggregated = aggregation !== undefined;
  const rawGeometry = _getLayerGeometry({
    layer,
    binding,
    queryState,
    geometryCache,
    isAggregated,
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
    audit:
      queryState?.data?.type === "rows" ? queryState.data.audit : undefined,
    aggregation,
  });
  const isRendered = layer.isVisible && viewState.status === "ready";
  return {
    layerId: layer.id,
    layerSpec: _makeRenderedLayerSpec({
      layer,
      geometry,
      isRendered,
      isAggregated,
    }),
    interactiveLayerIds: _getInteractiveLayerIds({
      layer,
      isRendered,
      isAggregated,
    }),
    viewState,
    bounds: getBoundsFromFeatureCollection(geometry.featureCollection),
    legendUpdate,
    hasDrawnDisputedFeature:
      isRendered &&
      DisputedBoundary.hasDrawnDisputedFeature({
        values: layer.disputedStatusValues,
        featureCollection: geometry.featureCollection,
      }),
  };
}
