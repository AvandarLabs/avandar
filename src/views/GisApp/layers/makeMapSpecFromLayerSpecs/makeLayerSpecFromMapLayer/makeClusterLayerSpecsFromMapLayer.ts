import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { SELECTED_STROKE_COLOR } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type {
  CircleRadiusValue,
  MapLayerSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ExpressionSpecification } from "maplibre-gl";

/**
 * Paint a clustered point source needs, independent of the symbology that
 * produced it: a native `cluster` symbology and an auto-clustered `circle`
 * layer both resolve to this shape before rendering. `radius` is the
 * unclustered circle's size, carried through explicitly because an
 * auto-clustered layer has no `cluster` symbology to read a shared radius
 * from.
 */
export type ClusterPaint = {
  color: string | ExpressionSpecification;
  stroke: MapLayer.Stroke;
  radius: CircleRadiusValue;
};

/**
 * Where a feature's `point_count` came from, which decides how the paint layers
 * tell a group apart from a lone point.
 *
 * MapLibre writes `point_count` only onto the cluster features it synthesizes,
 * so its presence alone identifies a group. A DuckDB-aggregated source carries
 * the property on every feature, including cells holding a single row, so those
 * layers must compare the count instead.
 */
export type ClusterCountSource = "maplibre" | "aggregatedRows";

type ClusterLayerOptions = {
  layer: MapLayer.T;
  sourceId: string;
  paint: ClusterPaint;
  countSource: ClusterCountSource;
};

/** Filter matching features that stand for more than one source row. */
function _buildGroupFilter(
  countSource: ClusterCountSource,
): ExpressionSpecification {
  return countSource === "maplibre" ?
      ["has", PointAggregateProperties.pointCount]
    : [">", ["get", PointAggregateProperties.pointCount], 1];
}

/** Filter matching features that stand for exactly one source row. */
function _buildSingleFilter(
  countSource: ClusterCountSource,
): ExpressionSpecification {
  return countSource === "maplibre" ?
      ["!", ["has", PointAggregateProperties.pointCount]]
    : ["<=", ["get", PointAggregateProperties.pointCount], 1];
}

/** Makes the count-sized circle representing one point cluster. */
function _buildClusterCircleLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId, paint } = options;
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "circle",
    source: sourceId,
    filter: _buildGroupFilter(options.countSource),
    paint: {
      "circle-color": paint.color,
      "circle-opacity": 0.8,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", PointAggregateProperties.pointCount],
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
 * `point_count_abbreviated` always arrives already formatted, from MapLibre for
 * a clustered source and from the aggregate SQL for a DuckDB-aggregated one, so
 * the label stays compact ("10k") without running a JS formatter inside a style
 * expression, which the renderer cannot do. The halo keeps the count readable
 * regardless of the bubble's configured color or the basemap's light or dark
 * style.
 */
function _buildClusterCountLayerSpec(
  options: ClusterLayerOptions,
): MapLayerSpec {
  const { layer, sourceId } = options;
  return {
    id: MapLayerIds.getClusterCountLayerIdFromLayerId(layer.id),
    type: "symbol",
    source: sourceId,
    filter: _buildGroupFilter(options.countSource),
    paint: {
      "text-color": "#1a1a1a",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
    layout: {
      "text-field": ["get", PointAggregateProperties.abbreviated],
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
    filter: _buildSingleFilter(options.countSource),
    paint: {
      "circle-color": paint.color,
      "circle-opacity": 0.8,
      "circle-radius": paint.radius,
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
