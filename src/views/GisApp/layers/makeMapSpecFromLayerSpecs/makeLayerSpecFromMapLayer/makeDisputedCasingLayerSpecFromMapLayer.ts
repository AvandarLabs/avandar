import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Casing width, in pixels. Wide enough to read as a distinct line. */
const CASING_WIDTH_PX = 1.5;

/**
 * The dashed casing drawn over disputed and undetermined outlines.
 *
 * It is a separate MapLibre layer rather than a data-driven expression on the
 * layer's own outline, because the casing must be drawn even when the layer
 * has no stroke at all: a boundary whose status is disputed may not go
 * unmarked simply because the author turned the outline off.
 *
 * @param options.layer The layer whose bind and id the casing follows.
 * @param options.sourceId The GeoJSON source the casing reads.
 * @param options.canvas Which ink to use. Every PDF passes `"light"`.
 * @returns One line layer, or an empty array when nothing is bound or no value
 * is assigned.
 */
export function makeDisputedCasingLayerSpecFromMapLayer(
  options: Readonly<{
    layer: MapLayer.T;
    sourceId: string;
    canvas: "light" | "dark";
  }>,
): MapLayerSpec[] {
  const { layer, sourceId, canvas } = options;
  const values = layer.disputedStatusValues;
  const markedValues = [...values.disputed, ...values.undetermined];
  if (!layer.disputedStatusColumn || markedValues.length === 0) {
    return [];
  }
  return [
    {
      id: MapLayerIds.toDisputedCasingLayerId(layer.id),
      type: "line",
      source: sourceId,
      filter: [
        "in",
        ["get", DisputedBoundary.propertyName],
        ["literal", markedValues],
      ],
      paint: {
        "line-color": DisputedBoundary.casingColors[canvas],
        "line-width": CASING_WIDTH_PX,
        "line-dasharray": [...DisputedBoundary.dasharray],
      },
      ...(layer.isVisible ? {} : { layout: { visibility: "none" as const } }),
    },
  ];
}
