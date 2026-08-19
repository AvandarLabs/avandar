import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { withQueryColumn } from "./withQueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Repaints the layer's symbols in `color`. */
function withSymbolColor(
  options: Readonly<{ layer: MapLayer.T; color: string }>,
): MapLayer.T {
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
}

/** Sets a flat circle's radius, in pixels. */
function withCircleRadius(
  options: Readonly<{ layer: MapLayer.T; radius: number }>,
): MapLayer.T {
  const { layer, radius } = options;
  if (layer.symbology.type !== "circle" || layer.symbology.radius === radius) {
    return layer;
  }
  return {
    ...layer,
    symbology: { ...layer.symbology, radius },
  } as MapLayer.Standard;
}

/** Sets a cluster's grouping radius, in pixels. */
function withClusterRadius(
  options: Readonly<{ layer: MapLayer.T; radiusPx: number }>,
): MapLayer.T {
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
}

/** Sets a heatmap's influence radius, in pixels. */
function withHeatmapRadius(
  options: Readonly<{ layer: MapLayer.T; radiusPx: number }>,
): MapLayer.T {
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
}

/** Sets the optional numeric column that weights heatmap points. */
function withHeatmapWeight(
  options: Readonly<{
    layer: MapLayer.T;
    column: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, column } = options;
  if (
    layer.symbology.type !== "heatmap" ||
    (column && !QueryColumn.isNumeric(column))
  ) {
    return layer;
  }
  const withColumn = column ? withQueryColumn({ layer, column }) : layer;
  if (layer.symbology.weight === column?.id && withColumn === layer) {
    return layer;
  }
  return {
    ...withColumn,
    symbology: { ...layer.symbology, weight: column?.id },
  } as MapLayer.Standard;
}

/** Sets the sequential colors used by a heatmap. */
function withHeatmapRamp(
  options: Readonly<{ layer: MapLayer.T; ramp: readonly string[] }>,
): MapLayer.T {
  const { layer, ramp } = options;
  if (layer.symbology.type !== "heatmap" || layer.symbology.ramp === ramp) {
    return layer;
  }
  return {
    ...layer,
    symbology: { ...layer.symbology, ramp },
  } as MapLayer.Standard;
}

/** Sets a proportional symbol's largest radius, in pixels. */
function withMaxSymbolRadius(
  options: Readonly<{ layer: MapLayer.T; maxRadius: number }>,
): MapLayer.T {
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
}

/** Sets a proportional symbol's smallest radius, in pixels. */
function withMinSymbolRadius(
  options: Readonly<{ layer: MapLayer.T; minRadius: number }>,
): MapLayer.T {
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
}

/** Sets how proportional symbol values map to radii. */
function withSymbolScale(
  options: Readonly<{
    layer: MapLayer.T;
    scale: "sqrt" | "linear";
  }>,
): MapLayer.T {
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
}

/** Sets the symbol outline. */
function withStroke(
  options: Readonly<{
    layer: MapLayer.T;
    stroke: Partial<MapLayer.ClusterSymbology["stroke"]>;
  }>,
): MapLayer.T {
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
}

/** Color, stroke, radius, and heatmap-paint updates for a map layer. */
export const symbologyPaintUpdates = {
  withSymbolColor,
  withCircleRadius,
  withClusterRadius,
  withHeatmapRadius,
  withHeatmapWeight,
  withHeatmapRamp,
  withMaxSymbolRadius,
  withMinSymbolRadius,
  withSymbolScale,
  withStroke,
};
