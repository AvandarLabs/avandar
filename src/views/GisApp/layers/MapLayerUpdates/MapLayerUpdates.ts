import {
  isDefined,
  makeMap,
  makeSet,
  prop,
  propEq,
  propPasses,
} from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { match } from "ts-pattern";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

/** True when `column` is already in the layer's selected query columns. */
function _hasQueryColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): boolean {
  const { layer, column } = options;
  return layer.source.queryColumns.some(propEq("id", column.id));
}

/**
 * Adds `column` to the layer's query if it is not already selected. Columns a
 * layer binds to must be part of its query, or it yields no column names.
 */
function _withQueryColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): MapLayer.T {
  const { layer, column } = options;
  if (_hasQueryColumn({ layer, column })) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, column],
    },
  } as MapLayer.Standard;
}

/** How many source columns the default popup selects. */
const DEFAULT_POPUP_COLUMN_LIMIT = 12;

/** Measure column id when an area aggregation is not a count. */
function _getAreaAggregationMeasureColumnId(
  aggregation: MapLayer.AreaAggregation | undefined,
): QueryColumn.Id | undefined {
  return aggregation?.operation === "count" ?
      undefined
    : aggregation.measureColumn;
}

/** Column ids the layer needs regardless of what the popup shows. */
function _getRequiredColumnIds(layer: MapLayer.T): Set<QueryColumn.Id> {
  const binding = layer.geoBinding;
  const color =
    layer.symbology.type === "heatmap" ? undefined : layer.symbology.color;
  const areaAggregationMeasureColumnId =
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries" ||
    binding?.type === "binPointsToGrid" ?
      _getAreaAggregationMeasureColumnId(binding.aggregation)
    : undefined;
  return makeSet(
    [
      binding?.type === "latLngColumns" ? binding.latitude : undefined,
      binding?.type === "latLngColumns" ? binding.longitude : undefined,
      binding?.type === "geometryColumn" ? binding.column : undefined,
      binding?.type === "binPointsToGrid" &&
      binding.points.type === "latLngColumns" ?
        binding.points.latitude
      : undefined,
      binding?.type === "binPointsToGrid" &&
      binding.points.type === "latLngColumns" ?
        binding.points.longitude
      : undefined,
      binding?.type === "binPointsToGrid" &&
      binding.points.type === "geometryColumn" ?
        binding.points.column
      : undefined,
      areaAggregationMeasureColumnId,
      layer.symbology.type === "proportionalSymbol" ?
        layer.symbology.value
      : undefined,
      layer.symbology.type === "heatmap" ? layer.symbology.weight : undefined,
      color && color.type !== "single" && color.value.type === "queryColumn" ?
        color.value.column
      : undefined,
      (
        color?.type === "graduated" &&
        color.normalization?.denominator.type === "queryColumn"
      ) ?
        color.normalization.denominator.column
      : undefined,
    ].filter(isDefined),
  );
}

type GeometryBindingType = "latLngColumns" | "geometryColumn";

type BoundaryJoinUpdate = {
  dataKeyColumn: QueryColumn.T;
  matching: "exact" | "normalizedName";
  boundary: MapLayer.BoundarySource;
};

type PointAggregationUpdate = {
  points: MapLayer.PointBinding;
  boundary: MapLayer.BoundarySource;
  pointColumns?: readonly QueryColumn.T[];
};

type AreaAggregationUpdate =
  | { operation: "count" }
  | {
      operation: "sum" | "avg" | "min" | "max";
      measureColumn: QueryColumn.T;
    };

/** Creates paint compatible with one direct geometry family. */
function _withGeometryFamilySymbology(
  layer: MapLayer.T,
  family: MapLayer.GeometryFamily,
): MapLayer.Symbology {
  const color =
    (
      layer.symbology.type !== "heatmap" &&
      layer.symbology.color.type === "single"
    ) ?
      layer.symbology.color
    : { type: "single" as const, color: MapLayer.defaultSymbolColor };
  const stroke =
    layer.symbology.type === "heatmap" ?
      MapLayer.createDefaultFillSymbology().stroke
    : layer.symbology.stroke;
  if (family === "polygon") {
    return { ...MapLayer.createDefaultFillSymbology(), color, stroke };
  }
  if (family === "line") {
    return { type: "line", color, stroke };
  }
  return {
    type: "circle",
    radius: MapLayer.defaultSymbolRadius,
    color,
    stroke,
  };
}

/** Returns default simplification for the selected geometry family. */
function _getDefaultSimplification(
  family: MapLayer.GeometryFamily,
): MapLayer.GeometrySimplification | undefined {
  return family === "point" ? undefined : { tolerancePixels: 0.75 };
}

function _getSingleColor(layer: MapLayer.T): string {
  const symbology = layer.symbology;
  if (symbology.type === "heatmap") {
    return MapLayer.defaultSymbolColor;
  }
  const { color } = symbology;
  if (color.type === "single") {
    return color.color;
  }
  return (
    (color.type === "graduated" ? color.ramp[0] : color.categories[0]?.color) ??
    MapLayer.defaultSymbolColor
  );
}

function _getStroke(layer: MapLayer.T): MapLayer.ClusterSymbology["stroke"] {
  return layer.symbology.type === "heatmap" ?
      MapLayer.createDefaultFillSymbology().stroke
    : layer.symbology.stroke;
}

function _withCircleSymbology(layer: MapLayer.T): MapLayer.T {
  if (layer.sensitivity.mode === "aggregateOnly") {
    return layer;
  }
  const radius =
    layer.symbology.type === "proportionalSymbol" ?
      layer.symbology.maxRadius
    : MapLayer.defaultSymbolRadius;
  return {
    ...layer,
    symbology: {
      type: "circle",
      radius,
      color:
        layer.symbology.type === "heatmap" ?
          { type: "single", color: MapLayer.defaultSymbolColor }
        : layer.symbology.color,
      stroke: _getStroke(layer),
    },
  } as MapLayer.Standard;
}

function _withProportionalSymbology(
  options: Readonly<{
    layer: MapLayer.T;
    valueColumn: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, valueColumn } = options;
  if (!valueColumn || layer.sensitivity.mode === "aggregateOnly") {
    return layer;
  }
  const maxRadius =
    layer.symbology.type === "circle" ?
      layer.symbology.radius
    : MapLayer.defaultMaxSymbolRadius;
  const withColumn = _withQueryColumn({ layer, column: valueColumn });
  return {
    ...withColumn,
    symbology: {
      type: "proportionalSymbol",
      value: valueColumn.id,
      minRadius: MapLayer.defaultMinSymbolRadius,
      maxRadius,
      scale: "sqrt",
      color:
        layer.symbology.type === "heatmap" ?
          { type: "single", color: MapLayer.defaultSymbolColor }
        : layer.symbology.color,
      stroke: _getStroke(layer),
    },
  } as MapLayer.Standard;
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

/**
 * Immutable updates to a map layer, driven by the layer inspector.
 *
 * Every updater returns the layer it was given, unchanged by reference, when
 * there is nothing to change. The inspector relies on that: an equal-but-new
 * layer would re-render the map on every keystroke.
 */
export const MapLayerUpdates = {
  /** Finds a query column already selected on the layer by its id. */
  getQueryColumnFromLayer: (
    options: Readonly<{
      layer: MapLayer.T;
      columnId: QueryColumn.Id | undefined;
    }>,
  ): QueryColumn.T | undefined => {
    const { layer, columnId } = options;
    return columnId ?
        layer.source.queryColumns.find(propEq("id", columnId))
      : undefined;
  },

  /** Points the layer at a new data source, clearing what no longer applies. */
  withDataSource: (
    options: Readonly<{
      layer: MapLayer.T;
      dataSource: QueryDataSource.T | undefined;
    }>,
  ): MapLayer.T => {
    const { layer, dataSource } = options;
    const isUnchanged =
      layer.source.dataSource === dataSource &&
      layer.source.queryColumns.length === 0 &&
      layer.geoBinding === undefined &&
      layer.popup.columnIds === "all" &&
      layer.popup.action === undefined;
    if (isUnchanged) {
      return layer;
    }
    return {
      ...layer,
      source: { ...layer.source, dataSource, queryColumns: [] },
      geoBinding: undefined,
      popup: { columnIds: "all", action: undefined },
    };
  },

  /**
   * Binds one axis of the geo binding to `column`, selecting the column into
   * the layer's query if it is not already there.
   */
  withGeoBindingAxis: (
    options: Readonly<{
      layer: MapLayer.T;
      axis: "latitude" | "longitude";
      column: QueryColumn.T | undefined;
    }>,
  ): MapLayer.T => {
    const { layer, axis, column } = options;
    const binding =
      layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
    const isUnchanged =
      column?.id === binding?.[axis] &&
      (!column || _hasQueryColumn({ layer, column }));
    if (isUnchanged) {
      return layer;
    }
    const withColumn = column ? _withQueryColumn({ layer, column }) : layer;
    return {
      ...withColumn,
      geoBinding: {
        type: "latLngColumns",
        latitude: binding?.latitude,
        longitude: binding?.longitude,
        [axis]: column?.id,
      },
    } as MapLayer.T;
  },

  /** Exchanges complete latitude and longitude column bindings. */
  swapLatLngColumns: (layer: MapLayer.T): MapLayer.T => {
    const binding = layer.geoBinding;
    if (
      binding?.type !== "latLngColumns" ||
      !isDefined(binding.latitude) ||
      !isDefined(binding.longitude) ||
      binding.latitude === binding.longitude
    ) {
      return layer;
    }
    return {
      ...layer,
      geoBinding: {
        ...binding,
        latitude: binding.longitude,
        longitude: binding.latitude,
      },
    } as MapLayer.T;
  },

  /** Switches between coordinate and encoded-geometry bindings. */
  withGeometryBindingType: (
    layer: MapLayer.T,
    type: GeometryBindingType,
    geometryColumn?: QueryColumn.T,
  ): MapLayer.T => {
    if (type === "latLngColumns") {
      if (layer.geoBinding?.type === "latLngColumns") {
        return layer;
      }
      if (layer.sensitivity.mode === "aggregateOnly") {
        return layer;
      }
      return {
        ...layer,
        geoBinding: {
          type: "latLngColumns",
          latitude: undefined,
          longitude: undefined,
        },
        symbology: _withGeometryFamilySymbology(layer, "point"),
      } as MapLayer.T;
    }
    if (!geometryColumn) {
      return layer;
    }
    const withColumn = _withQueryColumn({ layer, column: geometryColumn });
    const family =
      layer.sensitivity.mode === "aggregateOnly" ? "polygon" : "point";
    return {
      ...withColumn,
      geoBinding: {
        type: "geometryColumn",
        column: geometryColumn.id,
        encoding: "wkt",
        family,
        simplification: _getDefaultSimplification(family),
      },
      symbology: _withGeometryFamilySymbology(layer, family),
    } as MapLayer.T;
  },

  /** Selects the encoded geometry source column and keeps it in the query. */
  withGeometryColumn: (
    layer: MapLayer.T,
    column: QueryColumn.T,
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "geometryColumn") {
      return layer;
    }
    const isUnchanged =
      binding.column === column.id && _hasQueryColumn({ layer, column });
    if (isUnchanged) {
      return layer;
    }
    const withColumn = _withQueryColumn({ layer, column });
    return {
      ...withColumn,
      geoBinding: { ...binding, column: column.id },
    } as MapLayer.T;
  },

  /** Sets how the selected geometry column is encoded. */
  withGeometryEncoding: (
    layer: MapLayer.T,
    encoding: MapLayer.GeometryEncoding,
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "geometryColumn" || binding.encoding === encoding) {
      return layer;
    }
    return {
      ...layer,
      geoBinding: { ...binding, encoding },
    } as MapLayer.T;
  },

  /** Sets expected geometry family and compatible paint defaults. */
  withGeometryFamily: (
    layer: MapLayer.T,
    family: MapLayer.GeometryFamily,
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "geometryColumn" || binding.family === family) {
      return layer;
    }
    if (layer.sensitivity.mode === "aggregateOnly" && family !== "polygon") {
      return layer;
    }
    return {
      ...layer,
      geoBinding: {
        ...binding,
        family,
        simplification: _getDefaultSimplification(family),
      },
      symbology: _withGeometryFamilySymbology(layer, family),
    } as MapLayer.T;
  },

  /** Sets or disables line and polygon simplification. */
  withGeometrySimplification: (
    layer: MapLayer.T,
    simplification: MapLayer.GeometrySimplification | undefined,
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "geometryColumn" || binding.family === "point") {
      return layer;
    }
    if (
      binding.simplification?.tolerancePixels ===
      simplification?.tolerancePixels
    ) {
      return layer;
    }
    return {
      ...layer,
      geoBinding: { ...binding, simplification },
    } as MapLayer.T;
  },

  /** Creates or updates a complete source-key boundary join. */
  withBoundaryJoin: (
    layer: MapLayer.T,
    update: BoundaryJoinUpdate,
  ): MapLayer.T => {
    const withColumn = _withQueryColumn({
      layer,
      column: update.dataKeyColumn,
    });
    const currentBinding = layer.geoBinding;
    const outputValueId =
      currentBinding?.type === "joinToBoundaries" ?
        currentBinding.aggregation.outputValueId
      : uuid<MapLayer.AreaAggregationOutputId>();
    const aggregation =
      currentBinding?.type === "joinToBoundaries" ?
        currentBinding.aggregation
      : { operation: "count" as const, outputValueId };
    return {
      ...withColumn,
      geoBinding: {
        type: "joinToBoundaries",
        dataKeyColumn: update.dataKeyColumn.id,
        matching: update.matching,
        boundary: update.boundary,
        aggregation,
      },
      symbology: _withGeometryFamilySymbology(layer, "polygon"),
    } as MapLayer.T;
  },

  /** Creates or updates a point-in-polygon boundary aggregation. */
  withPointAggregation: (
    layer: MapLayer.T,
    update: PointAggregationUpdate,
  ): MapLayer.T => {
    const pointColumnIds =
      update.points.type === "latLngColumns" ?
        [update.points.latitude, update.points.longitude]
      : [update.points.column];
    const pointColumnIdSet = makeSet(pointColumnIds.filter(isDefined));
    const withPointColumns = (update.pointColumns ?? []).reduce(
      (currentLayer, column) => {
        return pointColumnIdSet.has(column.id) ?
            _withQueryColumn({ layer: currentLayer, column })
          : currentLayer;
      },
      layer,
    );
    const currentBinding = layer.geoBinding;
    const aggregation =
      currentBinding?.type === "aggregatePointsToBoundaries" ?
        currentBinding.aggregation
      : {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        };
    return {
      ...withPointColumns,
      geoBinding: {
        type: "aggregatePointsToBoundaries",
        points: update.points,
        boundary: update.boundary,
        aggregation,
      },
      symbology: _withGeometryFamilySymbology(layer, "polygon"),
    } as MapLayer.T;
  },

  /** Bins the layer's current point source into a fixed-meter grid. */
  withGridBin: (layer: MapLayer.T): MapLayer.T => {
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
        layer.symbology.type === "fill" ?
          layer.symbology
        : MapLayer.createDefaultFillSymbology(),
    } as MapLayer.T;
  },

  /** Selects the polygon grid shape used for point bins. */
  withGridType: (
    layer: MapLayer.T,
    grid: MapLayer.GridBinBinding["grid"],
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "binPointsToGrid" || binding.grid === grid) {
      return layer;
    }
    return { ...layer, geoBinding: { ...binding, grid } } as MapLayer.T;
  },

  /** Sets and clamps the fixed cell size used for point bins. */
  withGridSizeMeters: (layer: MapLayer.T, sizeMeters: number): MapLayer.T => {
    const binding = layer.geoBinding;
    if (binding?.type !== "binPointsToGrid" || !Number.isFinite(sizeMeters)) {
      return layer;
    }
    const clampedSizeMeters = Math.min(
      1_000_000,
      Math.max(100, sizeMeters),
    );
    if (binding.sizeMeters === clampedSizeMeters) {
      return layer;
    }
    return {
      ...layer,
      geoBinding: { ...binding, sizeMeters: clampedSizeMeters },
    } as MapLayer.T;
  },

  /** Changes an area aggregation while preserving its stable output id. */
  withAreaAggregation: (
    layer: MapLayer.T,
    update: AreaAggregationUpdate,
  ): MapLayer.T => {
    const binding = layer.geoBinding;
    if (
      binding?.type !== "joinToBoundaries" &&
      binding?.type !== "aggregatePointsToBoundaries" &&
      binding?.type !== "binPointsToGrid"
    ) {
      return layer;
    }
    const withMeasure =
      update.operation === "count" ?
        layer
      : _withQueryColumn({ layer, column: update.measureColumn });
    const aggregation: MapLayer.AreaAggregation =
      update.operation === "count" ?
        {
          operation: "count",
          outputValueId: binding.aggregation.outputValueId,
        }
      : {
          operation: update.operation,
          measureColumn: update.measureColumn.id,
          outputValueId: binding.aggregation.outputValueId,
        };
    return {
      ...withMeasure,
      geoBinding: { ...binding, aggregation },
    } as MapLayer.T;
  },

  /**
   * Switches the layer between a flat circle and a proportional symbol sized
   * by `column`. Passing `undefined` returns it to a flat circle.
   */
  withSymbolSizeColumn: (
    options: Readonly<{
      layer: MapLayer.T;
      column: QueryColumn.T | undefined;
    }>,
  ): MapLayer.T => {
    const { layer, column } = options;
    if (layer.sensitivity.mode === "aggregateOnly") {
      return layer;
    }
    const { symbology } = layer;
    if (!column) {
      return symbology.type === "circle" ?
          layer
        : ({
            ...layer,
            symbology: {
              type: "circle",
              radius: MapLayer.defaultSymbolRadius,
              color:
                symbology.type === "heatmap" ?
                  { type: "single", color: MapLayer.defaultSymbolColor }
                : symbology.color,
              stroke: _getStroke(layer),
            },
          } as MapLayer.Standard);
    }
    const isUnchanged =
      symbology.type === "proportionalSymbol" &&
      symbology.value === column.id &&
      _hasQueryColumn({ layer, column });
    if (isUnchanged) {
      return layer;
    }
    const withColumn = _withQueryColumn({ layer, column });
    return {
      ...withColumn,
      symbology: {
        type: "proportionalSymbol",
        value: column.id,
        minRadius:
          symbology.type === "proportionalSymbol" ?
            symbology.minRadius
          : MapLayer.defaultMinSymbolRadius,
        maxRadius:
          symbology.type === "proportionalSymbol" ?
            symbology.maxRadius
          : MapLayer.defaultMaxSymbolRadius,
        scale:
          symbology.type === "proportionalSymbol" ? symbology.scale : "sqrt",
        color:
          symbology.type === "heatmap" ?
            { type: "single", color: MapLayer.defaultSymbolColor }
          : symbology.color,
        stroke: _getStroke(layer),
      },
    } as MapLayer.Standard;
  },

  /** Repaints the layer's symbols in `color`. */
  withSymbolColor: (
    options: Readonly<{ layer: MapLayer.T; color: string }>,
  ): MapLayer.T => {
    const { layer, color } = options;
    if (layer.symbology.type === "heatmap") {
      return layer;
    }
    if (
      layer.symbology.color.type === "single" &&
      layer.symbology.color.color === color
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: {
        ...layer.symbology,
        color: { type: "single", color },
      },
    } as MapLayer.T;
  },

  /** Replaces color behavior and invalidates its derived legend output. */
  withLayerColor: (layer: MapLayer.T, color: MapLayer.Color): MapLayer.T => {
    if (layer.symbology.type === "heatmap") {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, color },
      legend: { ...layer.legend, breaks: [], entries: [] },
    } as MapLayer.T;
  },

  /** Applies finite, strictly increasing manual classification cuts. */
  withManualBreaks: (
    layer: MapLayer.T,
    breaks: readonly number[],
  ): MapLayer.T => {
    if (layer.symbology.type === "heatmap") {
      return layer;
    }
    const color = layer.symbology.color;
    const isValid = breaks.every((value, index) => {
      return (
        Number.isFinite(value) && (index === 0 || value > breaks[index - 1]!)
      );
    });
    if (color.type !== "graduated" || !isValid) {
      return layer;
    }
    return MapLayerUpdates.withLayerColor(layer, {
      ...color,
      classification: { method: "manual", breaks },
    });
  },

  /** Sets which columns a feature's popup shows and queries. */
  withPopupColumns: (
    options: Readonly<{
      layer: MapLayer.T;
      columns: readonly QueryColumn.T[];
    }>,
  ): MapLayer.T => {
    const { layer, columns } = options;
    const requiredIds = _getRequiredColumnIds(layer);
    const existingByBaseColumnId = makeMap(layer.source.queryColumns, {
      keyFn: prop("baseColumn.id"),
    });
    const selected = columns.map((column) => {
      return existingByBaseColumnId.get(column.baseColumn.id) ?? column;
    });
    const selectedIds = makeSet(selected, { key: "id" });
    const existingIds = makeSet(layer.source.queryColumns, { key: "id" });
    const nextQueryColumns = [
      ...layer.source.queryColumns.filter(
        propPasses("id", (columnId): columnId is QueryColumn.Id => {
          return requiredIds.has(columnId) || selectedIds.has(columnId);
        }),
      ),
      ...selected.filter(
        propPasses<QueryColumn.T, "id", QueryColumn.Id>(
          "id",
          (columnId): columnId is QueryColumn.Id => {
            return !existingIds.has(columnId);
          },
        ),
      ),
    ];
    return {
      ...layer,
      popup: { ...layer.popup, columnIds: selected.map(prop("id")) },
      source: { ...layer.source, queryColumns: nextQueryColumns },
    };
  },

  /** Selects capped source columns while the popup uses its default. */
  withDefaultPopupColumns: (
    options: Readonly<{
      layer: MapLayer.T;
      availableColumns: readonly QueryColumn.T[];
    }>,
  ): MapLayer.T => {
    const { layer, availableColumns } = options;
    if (layer.popup.columnIds !== "all") {
      return layer;
    }
    return MapLayerUpdates.withPopupColumns({
      layer,
      columns: availableColumns.slice(0, DEFAULT_POPUP_COLUMN_LIMIT),
    });
  },

  /** Sets the popup's optional click-through link. */
  withPopupAction: (
    options: Readonly<{
      layer: MapLayer.T;
      action: MapLayer.PopupAction | undefined;
    }>,
  ): MapLayer.T => {
    const { layer, action } = options;
    return { ...layer, popup: { ...layer.popup, action } };
  },

  /** Switches the layer's symbology type, preserving compatible settings. */
  withSymbologyType: (
    options: Readonly<{
      layer: MapLayer.T;
      change: Readonly<{
        nextType: "circle" | "proportionalSymbol" | "cluster" | "heatmap";
        valueColumn: QueryColumn.T | undefined;
        remembered: MapLayer.Symbology | undefined;
      }>;
    }>,
  ): MapLayer.T => {
    const { layer, change } = options;
    if (layer.sensitivity.mode === "aggregateOnly") {
      return layer;
    }
    const { nextType, valueColumn, remembered } = change;
    if (remembered && remembered.type === nextType) {
      return { ...layer, symbology: remembered } as MapLayer.Standard;
    }
    if (layer.symbology.type === nextType) {
      return layer;
    }
    return match(nextType)
      .with("circle", () => {
        return _withCircleSymbology(layer);
      })
      .with("proportionalSymbol", () => {
        return _withProportionalSymbology({ layer, valueColumn });
      })
      .with("cluster", () => {
        return {
          ...layer,
          symbology: {
            type: "cluster",
            radiusPx: MapLayer.defaultClusterRadiusPx,
            color: { type: "single", color: _getSingleColor(layer) },
            stroke: _getStroke(layer),
          },
        } as MapLayer.Standard;
      })
      .with("heatmap", () => {
        return {
          ...layer,
          symbology: {
            type: "heatmap",
            radiusPx: MapLayer.defaultHeatmapRadiusPx,
            weight: undefined,
            ramp: MapLayer.defaultHeatmapRamp,
          },
        } as MapLayer.Standard;
      })
      .exhaustive();
  },

  /** Sets a flat circle's radius, in pixels. */
  withCircleRadius: (
    options: Readonly<{ layer: MapLayer.T; radius: number }>,
  ): MapLayer.T => {
    const { layer, radius } = options;
    if (
      layer.symbology.type !== "circle" ||
      layer.symbology.radius === radius
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, radius },
    } as MapLayer.Standard;
  },

  /** Sets a cluster's grouping radius, in pixels. */
  withClusterRadius: (
    options: Readonly<{ layer: MapLayer.T; radiusPx: number }>,
  ): MapLayer.T => {
    const { layer, radiusPx } = options;
    if (
      layer.symbology.type !== "cluster" ||
      layer.symbology.radiusPx === radiusPx
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, radiusPx },
    } as MapLayer.Standard;
  },

  /** Sets a heatmap's influence radius, in pixels. */
  withHeatmapRadius: (
    options: Readonly<{ layer: MapLayer.T; radiusPx: number }>,
  ): MapLayer.T => {
    const { layer, radiusPx } = options;
    if (
      layer.symbology.type !== "heatmap" ||
      layer.symbology.radiusPx === radiusPx
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, radiusPx },
    } as MapLayer.Standard;
  },

  /** Sets the optional numeric column that weights heatmap points. */
  withHeatmapWeight: (
    options: Readonly<{
      layer: MapLayer.T;
      column: QueryColumn.T | undefined;
    }>,
  ): MapLayer.T => {
    const { layer, column } = options;
    if (
      layer.symbology.type !== "heatmap" ||
      (column && !QueryColumn.isNumeric(column))
    ) {
      return layer;
    }
    const withColumn = column ? _withQueryColumn({ layer, column }) : layer;
    if (layer.symbology.weight === column?.id && withColumn === layer) {
      return layer;
    }
    return {
      ...withColumn,
      symbology: { ...layer.symbology, weight: column?.id },
    } as MapLayer.Standard;
  },

  /** Sets the sequential colors used by a heatmap. */
  withHeatmapRamp: (
    options: Readonly<{ layer: MapLayer.T; ramp: readonly string[] }>,
  ): MapLayer.T => {
    const { layer, ramp } = options;
    if (layer.symbology.type !== "heatmap" || layer.symbology.ramp === ramp) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, ramp },
    } as MapLayer.Standard;
  },

  /** Sets a proportional symbol's largest radius, in pixels. */
  withMaxSymbolRadius: (
    options: Readonly<{ layer: MapLayer.T; maxRadius: number }>,
  ): MapLayer.T => {
    const { layer, maxRadius } = options;
    if (
      layer.symbology.type !== "proportionalSymbol" ||
      layer.symbology.maxRadius === maxRadius
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, maxRadius },
    } as MapLayer.Standard;
  },

  /** Sets a proportional symbol's smallest radius, in pixels. */
  withMinSymbolRadius: (
    options: Readonly<{ layer: MapLayer.T; minRadius: number }>,
  ): MapLayer.T => {
    const { layer, minRadius } = options;
    if (
      layer.symbology.type !== "proportionalSymbol" ||
      layer.symbology.minRadius === minRadius
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, minRadius },
    } as MapLayer.Standard;
  },

  /** Sets how proportional symbol values map to radii. */
  withSymbolScale: (
    options: Readonly<{
      layer: MapLayer.T;
      scale: "sqrt" | "linear";
    }>,
  ): MapLayer.T => {
    const { layer, scale } = options;
    if (
      layer.symbology.type !== "proportionalSymbol" ||
      layer.symbology.scale === scale
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, scale },
    } as MapLayer.Standard;
  },

  /** Sets the symbol outline. */
  withStroke: (
    options: Readonly<{
      layer: MapLayer.T;
      stroke: Partial<MapLayer.ClusterSymbology["stroke"]>;
    }>,
  ): MapLayer.T => {
    const { layer, stroke } = options;
    if (layer.symbology.type === "heatmap") {
      return layer;
    }
    const updatedStroke = { ...layer.symbology.stroke, ...stroke };
    if (
      updatedStroke.color === layer.symbology.stroke.color &&
      updatedStroke.width === layer.symbology.stroke.width
    ) {
      return layer;
    }
    return {
      ...layer,
      symbology: { ...layer.symbology, stroke: updatedStroke },
    } as MapLayer.T;
  },

  /** Sets the layer's spatial privacy policy. */
  withSensitivity: (
    options: Readonly<{
      layer: MapLayer.T;
      sensitivity: MapLayer.Sensitivity;
    }>,
  ): MapLayer.T => {
    const { layer, sensitivity } = options;
    return MapLayer.withSensitivity(layer, sensitivity);
  },

  /** Replaces the layer's filter tree. */
  withFilters: (
    options: Readonly<{
      layer: MapLayer.T;
      filters: MapLayer.T["source"]["filters"];
    }>,
  ): MapLayer.T => {
    const { layer, filters } = options;
    if (filters === layer.source.filters) {
      return layer;
    }
    return { ...layer, source: { ...layer.source, filters } };
  },

  /** Patches the layer's legend. */
  withLegend: (
    options: Readonly<{
      layer: MapLayer.T;
      legend: Partial<MapLayer.Legend>;
    }>,
  ): MapLayer.T => {
    const { layer, legend } = options;
    return { ...layer, legend: { ...layer.legend, ...legend } };
  },

  /** Renames the layer, keeping its legend title in step until it diverges. */
  withName: (
    options: Readonly<{ layer: MapLayer.T; name: string }>,
  ): MapLayer.T => {
    const { layer, name } = options;
    if (name === layer.name) {
      return layer;
    }
    const legend =
      layer.legend.title === layer.name ?
        { ...layer.legend, title: name }
      : layer.legend;
    return { ...layer, name, legend };
  },

  /** Shows or hides the layer. */
  withVisibility: (
    options: Readonly<{ layer: MapLayer.T; isVisible: boolean }>,
  ): MapLayer.T => {
    const { layer, isVisible } = options;
    return isVisible === layer.isVisible ? layer : { ...layer, isVisible };
  },
};
