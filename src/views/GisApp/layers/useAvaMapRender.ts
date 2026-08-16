import {
  isDefined,
  makeMap,
  makeSet,
  noop,
  prop,
  propEq,
  sortObjList,
} from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo, useState } from "react";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { classifyLayerValues } from "@/views/GisApp/layers/classifyLayerValues/classifyLayerValues";
import { normalizeLayerValue } from "@/views/GisApp/layers/classifyLayerValues/normalizeLayerValue/normalizeLayerValue";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { makeSizeLegendStops } from "@/views/GisApp/layers/makeSizeLegendStops/makeSizeLegendStops";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { buildLayerLegendFingerprint } from "@/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends";
import type { LayerGeometry } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { LayerLegendUpdate } from "@/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** All map inputs derived from a complete layer stack. */
export type AvaMapRender = {
  spec: MapSpec;
  interactiveLayerIds: string[];
  layerViewStates: Map<MapLayer.Id, MapLayerViewState>;
  layerBounds: Map<MapLayer.Id, MapBounds | undefined>;
  legendUpdates: Map<MapLayer.Id, LayerLegendUpdate>;
};

type GetLayerStatusInput = {
  hasBinding: boolean;
  error: Error | undefined;
  isLoading: boolean | undefined;
  featureCount: number;
  droppedRowCount: number;
};

type MakeLayerViewStateInput = {
  layer: MapLayer.T;
  hasBinding: boolean;
  geometry: LayerGeometry;
  queryState: MapLayerQueryState | undefined;
};

type LayerRender = {
  layerId: MapLayer.Id;
  layerSpec: MapSpec | undefined;
  interactiveLayerIds: string[];
  viewState: MapLayerViewState;
  bounds: MapBounds | undefined;
  legendUpdate: LayerLegendUpdate | undefined;
};

type ClassifiedGeometry = {
  geometry: LayerGeometry;
  legendUpdate: LayerLegendUpdate | undefined;
};

const SIZE_LABEL_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

/** The largest single drop reason, or `undefined` when nothing was dropped. */
function _getLargestDropReason(
  drops: readonly GeometryDropReport[],
): DropReason | undefined {
  return sortObjList(drops, {
    sortBy: prop("count"),
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
  hasBinding,
  error,
  isLoading,
  featureCount,
  droppedRowCount,
}: GetLayerStatusInput): MapLayerViewState["status"] {
  return (
    !hasBinding ? "unbound"
    : error ? "error"
    : isLoading ? "loading"
    : featureCount === 0 && droppedRowCount === 0 ? "empty"
    : "ready"
  );
}

/** Builds the status consumed by the layer list and selected-layer controls. */
function _makeLayerViewState({
  layer,
  hasBinding,
  geometry,
  queryState,
}: MakeLayerViewStateInput): MapLayerViewState {
  const droppedRowCount = _getDroppedRowCount(geometry.drops);
  const error = queryState?.error ?? geometry.error;
  return {
    status: _getLayerStatus({
      hasBinding,
      error,
      isLoading: queryState?.isLoading,
      featureCount: geometry.featureCollection.features.length,
      droppedRowCount,
    }),
    error,
    featureCount: geometry.featureCollection.features.length,
    droppedRowCount,
    drops: geometry.drops,
    largestDropReason: _getLargestDropReason(geometry.drops),
    spatialDiagnostics:
      queryState?.data?.type === "spatial" ?
        queryState.data.diagnostics
      : undefined,
    ..._getAggregateFeatureCounts(geometry.featureCollection),
    filterCount: layer.source.filters.rules.length,
    onRetry: queryState?.refetch ?? noop,
  };
}

/** Counts aggregate feature states without exposing suppressed metrics. */
function _getAggregateFeatureCounts(
  featureCollection: GeoJSON.FeatureCollection,
): Pick<
  MapLayerViewState,
  "contributorCount" | "noDataCount" | "suppressedCount"
> {
  let contributorCount = 0;
  let noDataCount = 0;
  let suppressedCount = 0;
  featureCollection.features.forEach(({ properties }) => {
    const state = properties?.[MapLayerSpatialFeatureProperties.state];
    if (state === "noData") {
      noDataCount += 1;
    } else if (state === "suppressed") {
      suppressedCount += 1;
    }
    const count =
      properties?.[MapLayerSpatialFeatureProperties.contributorCount];
    if (typeof count === "number") {
      contributorCount += count;
    }
  });
  return { contributorCount, noDataCount, suppressedCount };
}

/** Gets the result-column name driving data-dependent point paint. */
function _getPaintValueColumnName(layer: MapLayer.T): string | undefined {
  const valueColumnId =
    layer.symbology.type === "proportionalSymbol" ? layer.symbology.value
    : layer.symbology.type === "heatmap" ? layer.symbology.weight
    : undefined;
  const valueColumn =
    valueColumnId ?
      layer.source.queryColumns.find(propEq("id", valueColumnId))
    : undefined;
  return valueColumn ?
      QueryColumn.getDerivedColumnName(valueColumn)
    : undefined;
}

/** Resolves a persisted value reference to its GeoJSON property name. */
function _getColorValuePropertyName(
  layer: MapLayer.T,
  value: MapLayer.LayerValue,
): string | undefined {
  if (value.type === "areaAggregation") {
    return MapLayerSpatialFeatureProperties.value;
  }
  const column = layer.source.queryColumns.find(propEq("id", value.column));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}

/** Reads and optionally normalizes one feature value. */
function _getFeatureColorValue(
  layer: MapLayer.T,
  properties: GeoJSON.GeoJsonProperties,
): unknown {
  const color = layer.symbology.color;
  if (color.type === "single" || !properties) {
    return undefined;
  }
  const propertyName = _getColorValuePropertyName(layer, color.value);
  const value = propertyName ? properties[propertyName] : undefined;
  if (color.type !== "graduated" || !color.normalization) {
    return value;
  }
  const denominator = properties[MapLayerSpatialFeatureProperties.denominator];
  return normalizeLayerValue(
    value,
    denominator,
    color.normalization.multiplier,
  );
}

function _getFeatureId(feature: GeoJSON.Feature, index: number): string {
  const reservedId =
    feature.properties?.[MapLayerSpatialFeatureProperties.featureId];
  return String(reservedId ?? feature.id ?? index);
}

/** Classifies configured categories in author order, followed by Other. */
function _classifyCategories(
  layer: MapLayer.T,
  features: readonly GeoJSON.Feature[],
  color: Extract<MapLayer.Color, { type: "categorical" }>,
): {
  breaks: readonly MapLayer.LegendBreak[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  entries: readonly MapLayer.LegendEntry[];
} {
  const classIndexes = new Map<string, number>();
  const counts = Array.from({ length: color.categories.length + 1 }, () => {
    return 0;
  });
  let noDataCount = 0;
  features.forEach((feature, index) => {
    const value = _getFeatureColorValue(layer, feature.properties);
    if (value === null || value === undefined) {
      noDataCount += 1;
      return;
    }
    const categoryIndex = color.categories.findIndex(({ value: category }) => {
      return category === String(value);
    });
    const classIndex =
      categoryIndex === -1 ? color.categories.length : categoryIndex;
    classIndexes.set(_getFeatureId(feature, index), classIndex);
    counts[classIndex] = (counts[classIndex] ?? 0) + 1;
  });
  const entries: MapLayer.LegendEntry[] = color.categories.map(
    (category, index) => {
      return { type: "value", ...category, count: counts[index] ?? 0 };
    },
  );
  entries.push({
    type: "value",
    color: color.other.color,
    label: color.other.label,
    count: counts.at(-1) ?? 0,
  });
  if (noDataCount > 0) {
    entries.push({ type: "noData", ...color.noData, count: noDataCount });
  }
  return { breaks: [], classIndexByFeatureId: classIndexes, entries };
}

function _makeClassifiedFeatures(
  features: readonly GeoJSON.Feature[],
  classIndexes: ReadonlyMap<string, number>,
): GeoJSON.Feature[] {
  return features.map((feature, index) => {
    const featureId = _getFeatureId(feature, index);
    const classIndex = classIndexes.get(featureId);
    if (classIndex === undefined) {
      return feature;
    }
    return {
      ...feature,
      properties: {
        ...feature.properties,
        [MapLayerSpatialFeatureProperties.classIndex]: classIndex,
      },
    };
  });
}

function _makeSizeStops(
  layer: MapLayer.T,
  features: readonly GeoJSON.Feature[],
): readonly MapLayer.SizeLegendStop[] {
  if (layer.symbology.type !== "proportionalSymbol") {
    return [];
  }
  const valueColumnName = _getPaintValueColumnName(layer);
  const values = features
    .map((feature) => {
      return valueColumnName ?
          feature.properties?.[valueColumnName]
        : undefined;
    })
    .filter((value): value is number => {
      return typeof value === "number";
    });
  return makeSizeLegendStops({
    values,
    minRadius: layer.symbology.minRadius,
    maxRadius: layer.symbology.maxRadius,
    scale: layer.symbology.scale,
    formatLabel: (value) => {
      return SIZE_LABEL_FORMATTER.format(value);
    },
  });
}

function _classifyLegend(
  layer: MapLayer.T,
  features: readonly GeoJSON.Feature[],
): {
  breaks: readonly MapLayer.LegendBreak[];
  classIndexByFeatureId: ReadonlyMap<string, number>;
  entries: readonly MapLayer.LegendEntry[];
} {
  if (layer.symbology.type === "heatmap") {
    return { breaks: [], classIndexByFeatureId: new Map(), entries: [] };
  }
  const color = layer.symbology.color;
  if (color.type === "single") {
    return { breaks: [], classIndexByFeatureId: new Map(), entries: [] };
  }
  return color.type === "categorical" ?
      _classifyCategories(layer, features, color)
    : classifyLayerValues(
        features.map((feature, index) => {
          return {
            featureId: _getFeatureId(feature, index),
            value: _getFeatureColorValue(layer, feature.properties),
          };
        }),
        {
          classification: color.classification,
          ramp: color.ramp,
          noData: color.noData,
        },
      );
}

/** Adds derived class indexes and the exact legend produced from them. */
function _classifyGeometry(
  layer: MapLayer.T,
  geometry: LayerGeometry,
  hasQueryData: boolean,
): ClassifiedGeometry {
  if (!hasQueryData) {
    return { geometry, legendUpdate: undefined };
  }
  const reportableFeatures = geometry.featureCollection.features.filter(
    (feature) => {
      return (
        feature.properties?.[MapLayerSpatialFeatureProperties.state] !==
        "suppressed"
      );
    },
  );
  const classification = _classifyLegend(layer, reportableFeatures);
  const suppressedCount =
    geometry.featureCollection.features.length - reportableFeatures.length;
  const entries = [...classification.entries];
  if (suppressedCount > 0) {
    entries.push({
      type: "suppressed",
      color: "#868e96",
      label: "",
      count: suppressedCount,
    });
  }
  return {
    geometry: {
      ...geometry,
      featureCollection: {
        ...geometry.featureCollection,
        features: _makeClassifiedFeatures(
          geometry.featureCollection.features,
          classification.classIndexByFeatureId,
        ),
      },
    },
    legendUpdate: {
      layerFingerprint: buildLayerLegendFingerprint(layer),
      breaks: classification.breaks,
      entries,
      sizeStops: _makeSizeStops(layer, reportableFeatures),
    },
  };
}

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
  const valueColumnName = _getPaintValueColumnName(layer);
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
function _getInteractiveLayerIds(
  layer: MapLayer.T,
  isRendered: boolean,
): string[] {
  if (!isRendered || layer.symbology.type === "heatmap") {
    return [];
  }
  if (layer.symbology.type === "cluster") {
    return [
      MapLayerIds.toLayerId(layer.id),
      MapLayerIds.toUnclusteredLayerId(layer.id),
    ];
  }
  return [MapLayerIds.toLayerId(layer.id)];
}

/** Derives all rendering state for one configured map layer. */
function _makeLayerRender({
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
  const { geometry, legendUpdate } = _classifyGeometry(
    layer,
    rawGeometry,
    queryState?.data !== undefined,
  );
  const viewState = _makeLayerViewState({
    layer,
    hasBinding: layer.geoBinding !== undefined,
    geometry,
    queryState,
  });
  const isRendered = layer.isVisible && viewState.status === "ready";
  return {
    layerId: layer.id,
    layerSpec: _makeRenderedLayerSpec({ layer, geometry, isRendered }),
    interactiveLayerIds: _getInteractiveLayerIds(layer, isRendered),
    viewState,
    bounds: getBoundsFromFeatureCollection(geometry.featureCollection),
    legendUpdate,
  };
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

/** Derives rendering, interaction, status, and bounds for all map layers. */
export function useAvaMapRender({
  mapConfig,
  layerQueryStates,
}: Readonly<{
  mapConfig: AvaMapConfig.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
}>): AvaMapRender {
  const [geometryCache] = useState(createLayerGeometryCache);

  return useMemo(() => {
    const cache = geometryCache;
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
      interactiveLayerIds: renderedLayers.flatMap(prop("interactiveLayerIds")),
      layerViewStates: makeMap(renderedLayers, {
        key: "layerId",
        valueKey: "viewState",
      }),
      layerBounds: makeMap(renderedLayers, {
        key: "layerId",
        valueKey: "bounds",
      }),
      legendUpdates: makeMap(
        renderedLayers.filter(({ legendUpdate }) => {
          return legendUpdate !== undefined;
        }),
        { key: "layerId", valueKey: "legendUpdate" },
      ) as Map<MapLayer.Id, LayerLegendUpdate>,
    };
  }, [geometryCache, mapConfig.layers, layerQueryStates]);
}
