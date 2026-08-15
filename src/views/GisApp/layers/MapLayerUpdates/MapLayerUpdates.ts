import {
  isDefined,
  makeMap,
  makeSet,
  prop,
  propEq,
  propPasses,
} from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { match } from "ts-pattern";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

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

/** How many source columns the default popup selects. */
const DEFAULT_POPUP_COLUMN_LIMIT = 12;

/** Column ids the layer needs regardless of what the popup shows. */
function _getRequiredColumnIds(layer: MapLayer.T): ReadonlySet<QueryColumn.Id> {
  return makeSet(
    [
      layer.geoBinding?.latitude,
      layer.geoBinding?.longitude,
      layer.symbology.type === "proportionalSymbol" ?
        layer.symbology.value
      : undefined,
    ].filter(isDefined),
  );
}

type SymbologyTypeChange = {
  nextType: MapLayer.Symbology["type"];
  valueColumn: QueryColumn.T | undefined;
  remembered: MapLayer.Symbology | undefined;
};

function _withCircleSymbology(layer: MapLayer.T): MapLayer.T {
  const radius =
    layer.symbology.type === "proportionalSymbol" ?
      layer.symbology.maxRadius
    : MapLayer.defaultSymbolRadius;
  return {
    ...layer,
    symbology: {
      type: "circle",
      radius,
      color: layer.symbology.color,
      stroke: layer.symbology.stroke,
    },
  };
}

function _withProportionalSymbology(
  layer: MapLayer.T,
  valueColumn: QueryColumn.T | undefined,
): MapLayer.T {
  if (!valueColumn) {
    return layer;
  }
  const maxRadius =
    layer.symbology.type === "circle" ?
      layer.symbology.radius
    : MapLayer.defaultMaxSymbolRadius;
  const withColumn = _withQueryColumn(layer, valueColumn);
  return {
    ...withColumn,
    symbology: {
      type: "proportionalSymbol",
      value: valueColumn.id,
      minRadius: MapLayer.defaultMinSymbolRadius,
      maxRadius,
      scale: "sqrt",
      color: layer.symbology.color,
      stroke: layer.symbology.stroke,
    },
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
    dataSource: QueryDataSource.T | undefined,
  ): MapLayer.T => {
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

  /** Sets which columns a feature's popup shows and queries. */
  withPopupColumns: (
    layer: MapLayer.T,
    columns: readonly QueryColumn.T[],
  ): MapLayer.T => {
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
      ...layer.source.queryColumns.filter((column) => {
        return requiredIds.has(column.id) || selectedIds.has(column.id);
      }),
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
    layer: MapLayer.T,
    availableColumns: readonly QueryColumn.T[],
  ): MapLayer.T => {
    if (layer.popup.columnIds !== "all") {
      return layer;
    }
    return MapLayerUpdates.withPopupColumns(
      layer,
      availableColumns.slice(0, DEFAULT_POPUP_COLUMN_LIMIT),
    );
  },

  /** Sets the popup's optional click-through link. */
  withPopupAction: (
    layer: MapLayer.T,
    action: MapLayer.PopupAction | undefined,
  ): MapLayer.T => {
    return { ...layer, popup: { ...layer.popup, action } };
  },

  /** Switches the layer's symbology type, preserving compatible settings. */
  withSymbologyType: (
    layer: MapLayer.T,
    params: SymbologyTypeChange,
  ): MapLayer.T => {
    const { nextType, valueColumn, remembered } = params;
    if (remembered && remembered.type === nextType) {
      return { ...layer, symbology: remembered };
    }
    if (layer.symbology.type === nextType) {
      return layer;
    }
    return match(nextType)
      .with("circle", () => {
        return _withCircleSymbology(layer);
      })
      .with("proportionalSymbol", () => {
        return _withProportionalSymbology(layer, valueColumn);
      })
      .exhaustive();
  },

  /** Sets a flat circle's radius, in pixels. */
  withCircleRadius: (layer: MapLayer.T, radius: number): MapLayer.T => {
    if (
      layer.symbology.type !== "circle" ||
      layer.symbology.radius === radius
    ) {
      return layer;
    }
    return { ...layer, symbology: { ...layer.symbology, radius } };
  },

  /** Sets a proportional symbol's largest radius, in pixels. */
  withMaxSymbolRadius: (layer: MapLayer.T, maxRadius: number): MapLayer.T => {
    if (
      layer.symbology.type !== "proportionalSymbol" ||
      layer.symbology.maxRadius === maxRadius
    ) {
      return layer;
    }
    return { ...layer, symbology: { ...layer.symbology, maxRadius } };
  },

  /** Sets the symbol outline. */
  withStroke: (
    layer: MapLayer.T,
    stroke: Partial<MapLayer.Symbology["stroke"]>,
  ): MapLayer.T => {
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
    };
  },

  /** Sets the layer's spatial privacy policy. */
  withSensitivity: (
    layer: MapLayer.T,
    sensitivity: MapLayer.Sensitivity,
  ): MapLayer.T => {
    return { ...layer, sensitivity };
  },

  /** Replaces the layer's filter tree. */
  withFilters: (
    layer: MapLayer.T,
    filters: MapLayer.T["source"]["filters"],
  ): MapLayer.T => {
    if (filters === layer.source.filters) {
      return layer;
    }
    return { ...layer, source: { ...layer.source, filters } };
  },

  /** Patches the layer's legend. */
  withLegend: (
    layer: MapLayer.T,
    legend: Partial<MapLayer.Legend>,
  ): MapLayer.T => {
    return { ...layer, legend: { ...layer.legend, ...legend } };
  },

  /** Renames the layer, keeping its legend title in step until it diverges. */
  withName: (layer: MapLayer.T, name: string): MapLayer.T => {
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
  withVisibility: (layer: MapLayer.T, isVisible: boolean): MapLayer.T => {
    return isVisible === layer.isVisible ? layer : { ...layer, isVisible };
  },
};
