import { makeColorExpressionFromColor } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeColorExpressionFromColor";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

/** Makes the polygon fill followed by its independently sized outline. */
export function makeFillLayerSpecsFromMapLayer(options: {
  layer: MapLayer.T;
  sourceId: string;
}): MapLayerSpec[] {
  const { layer, sourceId } = options;
  const symbology = layer.symbology;
  if (symbology.type !== "fill") {
    throw new Error("Fill symbology is required");
  }
  const visibility = layer.isVisible
    ? {}
    : { layout: { visibility: "none" as const } };
  const layerId = MapLayerIds.toLayerId(layer.id);
  return [
    {
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": makeColorExpressionFromColor(symbology.color),
        "fill-opacity": symbology.opacity,
      },
      ...visibility,
    },
    {
      id: `${layerId}-outline`,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": symbology.stroke.color,
        "line-width": symbology.stroke.width,
      },
      ...visibility,
    },
  ];
}
