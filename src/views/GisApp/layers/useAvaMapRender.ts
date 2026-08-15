import {
  isDefined,
  makeMap,
  makeSet,
  prop,
  propEq,
  sortObjList,
} from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo, useRef } from "react";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** All map inputs derived from a complete layer stack. */
export type AvaMapRender = {
  spec: MapSpec;
  interactiveLayerIds: readonly string[];
  layerViewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
};

type GetLayerStatusInput = {
  binding: MapLayer.GeoBindingColumnNames | undefined;
  error: Error | undefined;
  isLoading: boolean | undefined;
  featureCount: number;
  droppedRowCount: number;
};

type LayerGeometry = ReturnType<
  ReturnType<typeof createLayerGeometryCache>["get"]
>;

type MakeLayerViewStateInput = {
  layer: MapLayer.T;
  binding: MapLayer.GeoBindingColumnNames | undefined;
  geometry: LayerGeometry;
  queryState: MapLayerQueryState | undefined;
};

type UseAvaMapRenderInput = {
  mapConfig: AvaMapConfig.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
};

type MakeLayerRenderInput = {
  layer: MapLayer.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
  geometryCache: ReturnType<typeof createLayerGeometryCache>;
};

type LayerRender = {
  layerId: MapLayer.Id;
  layerSpec: MapSpec | undefined;
  interactiveLayerId: string | undefined;
  viewState: MapLayerViewState;
  bounds: MapBounds | undefined;
};

/** The largest single drop reason, or `undefined` when nothing was dropped. */
function _getLargestDropReason(
  drops: readonly GeometryDropReport[],
): DropReason | undefined {
  return sortObjList(drops, {
    sortBy: (drop) => {
      return drop.count;
    },
    comparator: (firstCount, secondCount) => {
      return secondCount - firstCount;
    },
  })[0]?.reason;
}

/** Counts source rows that could not become geometry. */
function _getDroppedRowCount(drops: readonly GeometryDropReport[]): number {
  return drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);
}

/** Chooses the data-health status presented for one layer. */
function _getLayerStatus({
  binding,
  error,
  isLoading,
  featureCount,
  droppedRowCount,
}: GetLayerStatusInput): MapLayerViewState["status"] {
  return (
    !binding ? "unbound"
    : error ? "error"
    : isLoading ? "loading"
    : featureCount === 0 && droppedRowCount === 0 ? "empty"
    : "ready"
  );
}

/** Builds the status consumed by the layer list and selected-layer controls. */
function _makeLayerViewState({
  layer,
  binding,
  geometry,
  queryState,
}: MakeLayerViewStateInput): MapLayerViewState {
  const droppedRowCount = _getDroppedRowCount(geometry.drops);
  const error = queryState?.error ?? geometry.error;
  return {
    status: _getLayerStatus({
      binding,
      error,
      isLoading: queryState?.isLoading,
      featureCount: geometry.featureCollection.features.length,
      droppedRowCount,
    }),
    error,
    featureCount: geometry.featureCollection.features.length,
    droppedRowCount,
    largestDropReason: _getLargestDropReason(geometry.drops),
    filterCount: layer.source.filters.rules.length,
    onRetry:
      queryState?.refetch ??
      (() => {
        return undefined;
      }),
  };
}

/** Gets the result-column name driving proportional symbol sizing. */
function _getValueColumnName(layer: MapLayer.T): string | undefined {
  const valueColumn =
    layer.symbology.type === "proportionalSymbol" ?
      layer.source.queryColumns.find(propEq("id", layer.symbology.value))
    : undefined;
  return valueColumn ?
      QueryColumn.getDerivedColumnName(valueColumn)
    : undefined;
}

function _makeRenderedLayerSpec(
  layer: MapLayer.T,
  geometry: LayerGeometry,
  isRendered: boolean,
): MapSpec | undefined {
  if (!isRendered) {
    return undefined;
  }
  const valueColumnName = _getValueColumnName(layer);
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

/** Derives all rendering state for one configured map layer. */
function _makeLayerRender({
  layer,
  layerQueryStates,
  geometryCache,
}: MakeLayerRenderInput): LayerRender {
  const queryState = layerQueryStates.get(layer.id);
  const binding = MapLayer.toGeoBinding(layer);
  const geometry = geometryCache.get({
    layerId: layer.id,
    binding,
    sensitivity: layer.sensitivity,
    propertyColumnNames: MapLayer.toPopupColumnNames(layer),
    rows: queryState?.queryResult?.data,
  });
  const viewState = _makeLayerViewState({
    layer,
    binding,
    geometry,
    queryState,
  });
  const isRendered = layer.isVisible && viewState.status === "ready";
  return {
    layerId: layer.id,
    layerSpec: _makeRenderedLayerSpec(layer, geometry, isRendered),
    interactiveLayerId:
      isRendered ? MapLayerIds.toLayerId(layer.id) : undefined,
    viewState,
    bounds: getBoundsFromFeatureCollection(geometry.featureCollection),
  };
}

/** Derives rendering, interaction, status, and bounds for all map layers. */
export function useAvaMapRender({
  mapConfig,
  layerQueryStates,
}: UseAvaMapRenderInput): AvaMapRender {
  const geometryCacheRef = useRef(createLayerGeometryCache());

  return useMemo(() => {
    const cache = geometryCacheRef.current;
    cache.prune(makeSet(mapConfig.layers, { key: "id" }));
    const renderedLayers = mapConfig.layers.map((layer) => {
      return _makeLayerRender({
        layer,
        layerQueryStates,
        geometryCache: cache,
      });
    });

    return {
      spec: makeMapSpecFromLayerSpecs(
        renderedLayers.map(prop("layerSpec")).filter(isDefined),
      ),
      interactiveLayerIds: renderedLayers
        .map(prop("interactiveLayerId"))
        .filter(isDefined),
      layerViewStates: makeMap(renderedLayers, {
        key: "layerId",
        valueKey: "viewState",
      }),
      layerBounds: makeMap(renderedLayers, {
        key: "layerId",
        valueKey: "bounds",
      }),
    };
  }, [mapConfig.layers, layerQueryStates]);
}
