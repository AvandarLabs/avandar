import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

import { isDefined, makeSet } from "@avandar/utils";

import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

import { withGeometryFamilySymbology } from "./withGeometryFamilySymbology";
import { withQueryColumn } from "./withQueryColumn";

type AreaBinding = Extract<
  MapLayer.GeoBinding,
  {
    type:
      | "joinToBoundaries"
      | "aggregatePointsToBoundaries"
      | "binPointsToGrid";
  }
>;

function _isAreaBinding(
  binding: MapLayer.GeoBinding | undefined,
): binding is AreaBinding {
  return (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries" ||
    binding?.type === "binPointsToGrid"
  );
}

function _getPointBindingFromLayer(layer: MapLayer.T): MapLayer.PointBinding {
  const binding = layer.geoBinding;
  if (binding?.type === "latLngColumns") {
    return binding;
  }
  if (binding?.type === "geometryColumn" && binding.family === "point") {
    return {
      type: "geometryColumn",
      column: binding.column,
      encoding: binding.encoding,
      family: "point",
      simplification: undefined,
      sourceCrs: binding.sourceCrs,
    };
  }
  return {
    type: "latLngColumns",
    latitude: undefined,
    longitude: undefined,
  };
}

function _withSelectedPointColumns(
  options: Readonly<{
    layer: MapLayer.T;
    points: MapLayer.PointBinding;
    pointColumns: readonly QueryColumn.T[];
  }>,
): MapLayer.T {
  const { layer, points, pointColumns } = options;
  const pointColumnIds =
    points.type === "latLngColumns"
      ? [points.latitude, points.longitude]
      : [points.column];
  const pointColumnIdSet = makeSet(pointColumnIds.filter(isDefined));
  return pointColumns
    .filter((column) => {
      return pointColumnIdSet.has(column.id);
    })
    .reduce((currentLayer, column) => {
      return withQueryColumn({ layer: currentLayer, column });
    }, layer);
}

/** Creates or updates a complete source-key boundary join. */
function withBoundaryJoin(
  options: Readonly<{
    layer: MapLayer.T;
    dataKeyColumn: QueryColumn.T;
    matching: "exact" | "normalizedName";
    boundary: MapLayer.BoundarySource;
  }>,
): MapLayer.T {
  const { layer, dataKeyColumn, matching, boundary } = options;
  const withColumn = withQueryColumn({ layer, column: dataKeyColumn });
  const currentBinding = layer.geoBinding;
  const outputValueId =
    currentBinding?.type === "joinToBoundaries"
      ? currentBinding.aggregation.outputValueId
      : uuid<MapLayer.AreaAggregationOutputId>();
  const aggregation =
    currentBinding?.type === "joinToBoundaries"
      ? currentBinding.aggregation
      : { operation: "count" as const, outputValueId };
  return {
    ...withColumn,
    geoBinding: {
      type: "joinToBoundaries",
      dataKeyColumn: dataKeyColumn.id,
      matching,
      boundary,
      aggregation,
    },
    symbology: withGeometryFamilySymbology({ layer, family: "polygon" }),
  } as MapLayer.T;
}

/** Creates or updates a point-in-polygon boundary aggregation. */
function withPointAggregation(
  options: Readonly<{
    layer: MapLayer.T;
    points: MapLayer.PointBinding;
    boundary: MapLayer.BoundarySource;
    pointColumns?: readonly QueryColumn.T[];
  }>,
): MapLayer.T {
  const { layer, points, boundary, pointColumns } = options;
  const withPointColumns = _withSelectedPointColumns({
    layer,
    points,
    pointColumns: pointColumns ?? [],
  });
  const currentBinding = layer.geoBinding;
  const aggregation =
    currentBinding?.type === "aggregatePointsToBoundaries"
      ? currentBinding.aggregation
      : {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        };
  return {
    ...withPointColumns,
    geoBinding: {
      type: "aggregatePointsToBoundaries",
      points,
      boundary,
      aggregation,
    },
    symbology: withGeometryFamilySymbology({ layer, family: "polygon" }),
  } as MapLayer.T;
}

/** Bins the layer's current point source into a fixed-meter grid. */
function withGridBin(layer: MapLayer.T): MapLayer.T {
  if (layer.geoBinding?.type === "binPointsToGrid") {
    return layer;
  }
  return {
    ...layer,
    geoBinding: {
      type: "binPointsToGrid",
      grid: "hex",
      sizeMeters: MapLayer.defaultGridSizeMeters,
      points: _getPointBindingFromLayer(layer),
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology:
      layer.symbology.type === "fill"
        ? layer.symbology
        : MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
}

/** Selects the polygon grid shape used for point bins. */
function withGridType(
  options: Readonly<{
    layer: MapLayer.T;
    grid: MapLayer.GridBinBinding["grid"];
  }>,
): MapLayer.T {
  const { layer, grid } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "binPointsToGrid" || binding.grid === grid) {
    return layer;
  }
  return { ...layer, geoBinding: { ...binding, grid } } as MapLayer.T;
}

/** Sets and clamps the fixed cell size used for point bins. */
function withGridSizeMeters(
  options: Readonly<{ layer: MapLayer.T; sizeMeters: number }>,
): MapLayer.T {
  const { layer, sizeMeters } = options;
  const binding = layer.geoBinding;
  if (binding?.type !== "binPointsToGrid" || !Number.isFinite(sizeMeters)) {
    return layer;
  }
  const clampedSizeMeters = Math.min(1_000_000, Math.max(100, sizeMeters));
  if (binding.sizeMeters === clampedSizeMeters) {
    return layer;
  }
  return {
    ...layer,
    geoBinding: { ...binding, sizeMeters: clampedSizeMeters },
  } as MapLayer.T;
}

/** Changes an area aggregation while preserving its stable output id. */
function withAreaAggregation(
  options: Readonly<
    { layer: MapLayer.T } & (
      | { operation: "count" }
      | {
          operation: "sum" | "avg" | "min" | "max";
          measureColumn: QueryColumn.T;
        }
    )
  >,
): MapLayer.T {
  const { layer } = options;
  const binding = layer.geoBinding;
  if (!_isAreaBinding(binding)) {
    return layer;
  }
  const withMeasure =
    options.operation === "count"
      ? layer
      : withQueryColumn({ layer, column: options.measureColumn });
  const aggregation: MapLayer.AreaAggregation =
    options.operation === "count"
      ? {
          operation: "count",
          outputValueId: binding.aggregation.outputValueId,
        }
      : {
          operation: options.operation,
          measureColumn: options.measureColumn.id,
          outputValueId: binding.aggregation.outputValueId,
        };
  return {
    ...withMeasure,
    geoBinding: { ...binding, aggregation },
  } as MapLayer.T;
}

/** Boundary-join, point-aggregation, and grid-bin updates for a map layer. */
export const areaBindingUpdates = {
  withBoundaryJoin,
  withPointAggregation,
  withGridBin,
  withGridType,
  withGridSizeMeters,
  withAreaAggregation,
};
