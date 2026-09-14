import { match } from "ts-pattern";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { hasQueryColumn } from "./hasQueryColumn";
import { withQueryColumn } from "./withQueryColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { AvailableSymbologyType } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";

function _getStroke(layer: MapLayer.T): MapLayer.ClusterSymbology["stroke"] {
  return layer.symbology.type === "heatmap"
    ? MapLayer.createDefaultFillSymbology().stroke
    : layer.symbology.stroke;
}

function _getCompatibleColor(layer: MapLayer.T): MapLayer.Color {
  return layer.symbology.type === "heatmap"
    ? { type: "single", color: MapLayer.defaultSymbolColor }
    : layer.symbology.color;
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

function _withCircleSymbology(layer: MapLayer.T): MapLayer.T {
  if (layer.sensitivity.mode === "aggregateOnly") {
    return layer;
  }
  const radius =
    layer.symbology.type === "proportionalSymbol"
      ? layer.symbology.maxRadius
      : MapLayer.defaultSymbolRadius;
  return {
    ...layer,
    symbology: {
      type: "circle",
      radius,
      color: _getCompatibleColor(layer),
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
    layer.symbology.type === "circle"
      ? layer.symbology.radius
      : MapLayer.defaultMaxSymbolRadius;
  const withColumn = withQueryColumn({ layer, column: valueColumn });
  return {
    ...withColumn,
    symbology: {
      type: "proportionalSymbol",
      value: valueColumn.id,
      minRadius: MapLayer.defaultMinSymbolRadius,
      maxRadius,
      scale: "sqrt",
      color: _getCompatibleColor(layer),
      stroke: _getStroke(layer),
    },
  } as MapLayer.Standard;
}

function _withSymbologyOfType(
  options: Readonly<{
    layer: MapLayer.T;
    nextType: AvailableSymbologyType;
    valueColumn: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, nextType, valueColumn } = options;
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
}

function _withDefaultCircleSymbology(layer: MapLayer.T): MapLayer.T {
  if (layer.symbology.type === "circle") {
    return layer;
  }
  return {
    ...layer,
    symbology: {
      type: "circle",
      radius: MapLayer.defaultSymbolRadius,
      color: _getCompatibleColor(layer),
      stroke: _getStroke(layer),
    },
  } as MapLayer.Standard;
}

function _withSizedValueColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): MapLayer.T {
  const { layer, column } = options;
  const { symbology } = layer;
  const isUnchanged =
    symbology.type === "proportionalSymbol" &&
    symbology.value === column.id &&
    hasQueryColumn({ layer, column });
  if (isUnchanged) {
    return layer;
  }
  const withColumn = withQueryColumn({ layer, column });
  return {
    ...withColumn,
    symbology: {
      type: "proportionalSymbol",
      value: column.id,
      minRadius:
        symbology.type === "proportionalSymbol"
          ? symbology.minRadius
          : MapLayer.defaultMinSymbolRadius,
      maxRadius:
        symbology.type === "proportionalSymbol"
          ? symbology.maxRadius
          : MapLayer.defaultMaxSymbolRadius,
      scale: symbology.type === "proportionalSymbol" ? symbology.scale : "sqrt",
      color: _getCompatibleColor(layer),
      stroke: _getStroke(layer),
    },
  } as MapLayer.Standard;
}

/**
 * Switches the layer between a flat circle and a proportional symbol sized
 * by `column`. Passing `undefined` returns it to a flat circle.
 */
function withSymbolSizeColumn(
  options: Readonly<{
    layer: MapLayer.T;
    column: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, column } = options;
  if (layer.sensitivity.mode === "aggregateOnly") {
    return layer;
  }
  if (!column) {
    return _withDefaultCircleSymbology(layer);
  }
  return _withSizedValueColumn({ layer, column });
}

/** Switches the layer's symbology type, preserving compatible settings. */
function withSymbologyType(
  options: Readonly<{
    layer: MapLayer.T;
    change: Readonly<{
      nextType: AvailableSymbologyType;
      valueColumn: QueryColumn.T | undefined;
      remembered: MapLayer.Symbology | undefined;
    }>;
  }>,
): MapLayer.T {
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
  return _withSymbologyOfType({ layer, nextType, valueColumn });
}

/** Symbology-type and symbol-size updates for a map layer. */
export const symbologyTypeUpdates = {
  withSymbolSizeColumn,
  withSymbologyType,
};
