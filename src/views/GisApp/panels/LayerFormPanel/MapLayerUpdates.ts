import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";

/** True when `column` is already in the layer's selected query columns. */
function _hasQueryColumn(layer: MapLayer.T, column: QueryColumn.T): boolean {
  return layer.source.queryColumns.some(propEq("id", column.id));
}

/**
 * Adds `column` to the layer's query if it is not already selected. Columns a
 * layer binds to must be part of its query, or it yields no column names.
 */
function _withQueryColumn(
  layer: MapLayer.T,
  column: QueryColumn.T,
): MapLayer.T {
  if (_hasQueryColumn(layer, column)) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, column],
    },
  };
}

/**
 * Immutable updates to a map layer, driven by the layer form.
 *
 * Every updater returns the layer it was given, unchanged by reference, when
 * there is nothing to change. The form relies on that: an equal-but-new layer
 * would re-render the map on every keystroke.
 */
export const MapLayerUpdates = {
  /** Finds a query column already selected on the layer by its id. */
  findQueryColumn: (
    layer: MapLayer.T,
    columnId: QueryColumn.Id | undefined,
  ): QueryColumn.T | undefined => {
    return columnId ?
        layer.source.queryColumns.find(propEq("id", columnId))
      : undefined;
  },

  /** Points the layer at a new data source, clearing what no longer applies. */
  withDataSource: (
    layer: MapLayer.T,
    dataSource: QueryDataSource | undefined,
  ): MapLayer.T => {
    const isUnchanged =
      layer.source.dataSource === dataSource &&
      layer.source.queryColumns.length === 0 &&
      layer.geoBinding === undefined;
    if (isUnchanged) {
      return layer;
    }
    return {
      ...layer,
      source: { ...layer.source, dataSource, queryColumns: [] },
      geoBinding: undefined,
    };
  },

  /**
   * Binds one axis of the geo binding to `column`, selecting the column into
   * the layer's query if it is not already there.
   */
  withGeoBindingAxis: (
    layer: MapLayer.T,
    axis: "latitude" | "longitude",
    column: QueryColumn.T | undefined,
  ): MapLayer.T => {
    const isUnchanged =
      column?.id === layer.geoBinding?.[axis] &&
      (!column || _hasQueryColumn(layer, column));
    if (isUnchanged) {
      return layer;
    }
    const withColumn = column ? _withQueryColumn(layer, column) : layer;
    return {
      ...withColumn,
      geoBinding: {
        type: "latLngColumns",
        latitude: withColumn.geoBinding?.latitude,
        longitude: withColumn.geoBinding?.longitude,
        [axis]: column?.id,
      },
    };
  },

  /**
   * Switches the layer between a flat circle and a proportional symbol sized
   * by `column`. Passing `undefined` returns it to a flat circle.
   */
  withSymbolSizeColumn: (
    layer: MapLayer.T,
    column: QueryColumn.T | undefined,
  ): MapLayer.T => {
    const { symbology } = layer;
    if (!column) {
      return symbology.type === "circle" ?
          layer
        : {
            ...layer,
            symbology: {
              type: "circle",
              radius: MapLayer.defaultSymbolRadius,
              color: symbology.color,
              stroke: symbology.stroke,
            },
          };
    }
    const isUnchanged =
      symbology.type === "proportionalSymbol" &&
      symbology.value === column.id &&
      _hasQueryColumn(layer, column);
    if (isUnchanged) {
      return layer;
    }
    const withColumn = _withQueryColumn(layer, column);
    return {
      ...withColumn,
      symbology: {
        type: "proportionalSymbol",
        value: column.id,
        minRadius: MapLayer.defaultMinSymbolRadius,
        maxRadius: MapLayer.defaultMaxSymbolRadius,
        scale: "sqrt",
        color: symbology.color,
        stroke: symbology.stroke,
      },
    };
  },

  /** Repaints the layer's symbols in `color`. */
  withSymbolColor: (layer: MapLayer.T, color: string): MapLayer.T => {
    if (layer.symbology.color.color === color) {
      return layer;
    }
    return {
      ...layer,
      symbology: {
        ...layer.symbology,
        color: { type: "single", color },
      },
    };
  },
};
