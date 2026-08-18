import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { CreateMapLayerSpecInput } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.types";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { ExpressionSpecification } from "maplibre-gl";

/** Makes an evenly spaced density expression from a heatmap ramp. */
function _buildHeatmapColor(ramp: readonly string[]): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(0, 0, 0, 0)",
    ...ramp.flatMap((color, index) => {
      return [(index + 1) / ramp.length, color];
    }),
  ] as ExpressionSpecification;
}

/** Makes a density layer from the configured radius, weight, and ramp. */
export function makeHeatmapLayerSpecFromMapLayer({
  layer,
  valueColumnName,
  sourceId,
}: Readonly<CreateMapLayerSpecInput>): MapLayerSpec {
  const { symbology } = layer;
  if (symbology.type !== "heatmap") {
    throw new Error("Heatmap symbology is required");
  }
  if (symbology.weight && valueColumnName === undefined) {
    throw new Error("Heatmap weight requires a resolved value column name");
  }
  const heatmapWeight: ExpressionSpecification | 1 =
    symbology.weight && valueColumnName !== undefined ?
      ["to-number", ["get", valueColumnName], 0]
    : 1;
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "heatmap",
    source: sourceId,
    paint: {
      "heatmap-weight": heatmapWeight,
      "heatmap-radius": symbology.radiusPx,
      "heatmap-color": _buildHeatmapColor(symbology.ramp),
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}
