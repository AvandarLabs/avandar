import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { SELECTED_STROKE_COLOR } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

type ClusterLayerOptions = {
  layer: MapLayer.T;
  sourceId: string;
};

/** Makes the count-sized circle representing one point cluster. */
function _buildClusterCircleLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId } = options;
  const { symbology } = layer;
  if (symbology.type !== "cluster") {
    throw new Error("Cluster symbology is required");
  }
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "circle",
    source: sourceId,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": symbology.color.color,
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
      "circle-stroke-width": symbology.stroke.width,
      "circle-stroke-color": symbology.stroke.color,
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}

/** Makes the abbreviated point-count label for one cluster. */
function _buildClusterCountLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId } = options;
  return {
    id: MapLayerIds.getClusterCountLayerIdFromLayerId(layer.id),
    type: "symbol",
    source: sourceId,
    filter: ["has", "point_count"],
    paint: {},
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
  const { layer, sourceId } = options;
  const { symbology } = layer;
  if (symbology.type !== "cluster") {
    throw new Error("Cluster symbology is required");
  }
  return {
    id: MapLayerIds.getUnclusteredLayerIdFromLayerId(layer.id),
    type: "circle",
    source: sourceId,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": symbology.color.color,
      "circle-opacity": 0.8,
      "circle-radius": MapLayer.defaultSymbolRadius,
      "circle-stroke-width": symbology.stroke.width,
      "circle-stroke-color": [
        "case",
        ["boolean", ["feature-state", "isSelected"], false],
        SELECTED_STROKE_COLOR,
        symbology.stroke.color,
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
