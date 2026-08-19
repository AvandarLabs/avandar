import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { SELECTED_STROKE_COLOR } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { ExpressionSpecification } from "maplibre-gl";

/**
 * Paint a clustered point source needs, independent of the symbology that
 * produced it: a native `cluster` symbology and an auto-clustered `circle` or
 * `proportionalSymbol` layer both resolve to this shape before rendering.
 */
export type ClusterPaint = {
  color: string | ExpressionSpecification;
  stroke: MapLayer.Stroke;
};

type ClusterLayerOptions = {
  layer: MapLayer.T;
  sourceId: string;
  paint: ClusterPaint;
};

/** Makes the count-sized circle representing one point cluster. */
function _buildClusterCircleLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId, paint } = options;
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "circle",
    source: sourceId,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": paint.color,
      "circle-opacity": 0.8,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "point_count"],
        1,
        20,
        100,
        30,
        750,
        40,
      ],
      "circle-stroke-width": paint.stroke.width,
      "circle-stroke-color": paint.stroke.color,
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}

/**
 * Makes the abbreviated point-count label for one cluster.
 *
 * `point_count_abbreviated` is computed by MapLibre itself from the raw
 * cluster count, so the label stays compact ("10k") without running a JS
 * formatter inside a style expression, which the renderer cannot do. The
 * halo keeps the count readable regardless of the bubble's configured color
 * or the basemap's light or dark style.
 */
function _buildClusterCountLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId } = options;
  return {
    id: MapLayerIds.getClusterCountLayerIdFromLayerId(layer.id),
    type: "symbol",
    source: sourceId,
    filter: ["has", "point_count"],
    paint: {
      "text-color": "#1a1a1a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      ...(layer.isVisible ? {} : { visibility: "none" }),
    },
  };
}

/** Makes the ordinary circle shown for points outside clusters. */
function _buildUnclusteredCircleLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId, paint } = options;
  return {
    id: MapLayerIds.getUnclusteredLayerIdFromLayerId(layer.id),
    type: "circle",
    source: sourceId,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": paint.color,
      "circle-opacity": 0.8,
      "circle-radius": MapLayer.defaultSymbolRadius,
      "circle-stroke-width": paint.stroke.width,
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "isSelected"], false],
        SELECTED_STROKE_COLOR,
        paint.stroke.color,
      ],
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}

/** Makes the three paint layers backed by one clustered source. */
export function makeClusterLayerSpecsFromMapLayer(
  options: ClusterLayerOptions,
): MapLayerSpec[] {
  return [
    _buildClusterCircleLayerSpec(options),
    _buildClusterCountLayerSpec(options),
    _buildUnclusteredCircleLayerSpec(options),
  ];
}
