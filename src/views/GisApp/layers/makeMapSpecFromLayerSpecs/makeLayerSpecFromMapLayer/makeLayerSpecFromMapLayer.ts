import { matchLiteral } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type {
  CircleRadiusValue,
  MapLayerSpec,
  MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { ExpressionSpecification } from "maplibre-gl";

/** Highlight applied to the feature the user has selected. */
const SELECTED_STROKE_COLOR = "#ffd700";

type ProportionalSymbol = Extract<
  MapLayer.Symbology,
  { type: "proportionalSymbol" }
>;

type MakeLayerSpecFromMapLayerInput = {
  layer: MapLayer.T;
  featureCollection: GeoJSON.FeatureCollection;
  stats: LayerStats;
  valueColumnName?: string;
};

type CreateMapLayerSpecInput = {
  layer: MapLayer.T;
  stats: LayerStats;
  valueColumnName: string | undefined;
  sourceId: string;
};

/** Builds color paint from flat or preclassified feature properties. */
function _buildColor(color: MapLayer.Color): string | ExpressionSpecification {
  if (color.type === "single") {
    return color.color;
  }
  const classColors =
    color.type === "graduated" ?
      color.ramp
    : color.categories.map(({ color: categoryColor }) => {
        return categoryColor;
      });
  const noDataColor = color.noData.color;
  const classMatch = [
    "match",
    ["get", MapLayerSpatialFeatureProperties.classIndex],
    ...classColors.flatMap((classColor, index) => {
      return [index, classColor];
    }),
    color.type === "categorical" ? color.other.color : noDataColor,
  ] as unknown as ExpressionSpecification;
  return [
    "case",
    ["==", ["get", MapLayerSpatialFeatureProperties.state], "suppressed"],
    "#868e96",
    ["==", ["get", MapLayerSpatialFeatureProperties.state], "noData"],
    noDataColor,
    classMatch,
  ];
}

/** Applies the selected scale to a numeric span. */
function _getScaledSpan({
  scale,
  span,
}: Readonly<{
  scale: ProportionalSymbol["scale"];
  span: number;
}>): number {
  return matchLiteral(scale, {
    sqrt: () => {
      return Math.sqrt(span);
    },
    linear: () => {
      return span;
    },
  });
}

/** Builds the MapLibre expression that scales a source value from zero. */
function _buildScaledValueExpression({
  scale,
  valueColumnName,
  minimum,
}: {
  scale: ProportionalSymbol["scale"];
  valueColumnName: string;
  minimum: number;
}): ExpressionSpecification {
  const normalized: ExpressionSpecification = [
    "max",
    0,
    ["-", ["to-number", ["get", valueColumnName], 0], minimum],
  ];
  return matchLiteral(scale, {
    sqrt: (): ExpressionSpecification => {
      return ["sqrt", normalized];
    },
    linear: (): ExpressionSpecification => {
      return normalized;
    },
  });
}

/**
 * Builds the `circle-radius` value. A flat circle is a constant; a
 * proportional symbol interpolates on the square root of the value, which
 * approximates area-proportional scaling (the `minRadius` floor keeps the
 * relationship from being exact).
 */
function _buildCircleRadius({
  symbology,
  stats,
  valueColumnName,
}: {
  symbology: MapLayer.Symbology;
  stats: LayerStats;
  valueColumnName: string | undefined;
}): CircleRadiusValue {
  if (symbology.type === "circle") {
    return symbology.radius;
  }
  if (symbology.type !== "proportionalSymbol") {
    throw new Error("Point symbology is required");
  }
  const { valueDomain } = stats;
  if (!valueColumnName || !valueDomain || valueDomain[0] === valueDomain[1]) {
    return symbology.minRadius;
  }
  const [minimum, maximum] = valueDomain;
  const scaledValue = _buildScaledValueExpression({
    scale: symbology.scale,
    valueColumnName,
    minimum,
  });
  return [
    "interpolate",
    ["linear"],
    scaledValue,
    0,
    symbology.minRadius,
    _getScaledSpan({ scale: symbology.scale, span: maximum - minimum }),
    symbology.maxRadius,
  ];
}

/** Creates the MapLibre circle layer for one persisted map layer. */
function _createCircleLayerSpec({
  layer,
  stats,
  valueColumnName,
  sourceId,
}: Readonly<CreateMapLayerSpecInput>): MapLayerSpec {
  const { symbology } = layer;
  if (symbology.type !== "circle" && symbology.type !== "proportionalSymbol") {
    throw new Error("Point symbology is required");
  }
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": _buildCircleRadius({
        symbology,
        stats,
        valueColumnName,
      }),
      "circle-color": _buildColor(symbology.color),
      "circle-opacity": 0.8,
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

/** Creates the MapLibre line layer for one persisted map layer. */
function _createLineLayerSpec(
  layer: MapLayer.T,
  sourceId: string,
): MapLayerSpec {
  const symbology = layer.symbology;
  if (symbology.type !== "line") {
    throw new Error("Line symbology is required");
  }
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "line",
    source: sourceId,
    paint: {
      "line-color": _buildColor(symbology.color),
      "line-width": symbology.stroke.width,
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}

/** Creates the polygon fill followed by its independently sized outline. */
function _createFillLayerSpecs(
  layer: MapLayer.T,
  sourceId: string,
): readonly MapLayerSpec[] {
  const symbology = layer.symbology;
  if (symbology.type !== "fill") {
    throw new Error("Fill symbology is required");
  }
  const visibility =
    layer.isVisible ? {} : { layout: { visibility: "none" as const } };
  const layerId = MapLayerIds.toLayerId(layer.id);
  return [
    {
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": _buildColor(symbology.color),
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

/** Creates the count-sized circle representing one point cluster. */
function _createClusterCircleLayerSpec(
  layer: MapLayer.T,
  sourceId: string,
): MapLayerSpec {
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

/** Creates the abbreviated point-count label for one cluster. */
function _createClusterCountLayerSpec(
  layer: MapLayer.T,
  sourceId: string,
): MapLayerSpec {
  return {
    id: MapLayerIds.toClusterCountLayerId(layer.id),
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

/** Creates the ordinary circle shown for points outside clusters. */
function _createUnclusteredCircleLayerSpec(
  layer: MapLayer.T,
  sourceId: string,
): MapLayerSpec {
  const { symbology } = layer;
  if (symbology.type !== "cluster") {
    throw new Error("Cluster symbology is required");
  }
  return {
    id: MapLayerIds.toUnclusteredLayerId(layer.id),
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

/** Creates the three paint layers backed by one clustered source. */
function _createClusterLayerSpecs(
  layer: MapLayer.T,
  sourceId: string,
): readonly MapLayerSpec[] {
  return [
    _createClusterCircleLayerSpec(layer, sourceId),
    _createClusterCountLayerSpec(layer, sourceId),
    _createUnclusteredCircleLayerSpec(layer, sourceId),
  ];
}

/** Builds an evenly spaced density expression from a heatmap ramp. */
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

/** Creates a density layer from the configured radius, weight, and ramp. */
function _createHeatmapLayerSpec({
  layer,
  valueColumnName,
  sourceId,
}: Readonly<CreateMapLayerSpecInput>): MapLayerSpec {
  const { symbology } = layer;
  if (symbology.type !== "heatmap") {
    throw new Error("Heatmap symbology is required");
  }
  let heatmapWeight: ExpressionSpecification | 1;
  if (symbology.weight) {
    if (!valueColumnName) {
      throw new Error("Heatmap weight requires a resolved value column name");
    }
    heatmapWeight = ["to-number", ["get", valueColumnName], 0];
  } else {
    heatmapWeight = 1;
  }
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

/** Creates the paint layers matching the configured geometry symbology. */
function _createMapLayerSpecs(
  options: Readonly<CreateMapLayerSpecInput>,
): readonly MapLayerSpec[] {
  if (options.layer.symbology.type === "fill") {
    return _createFillLayerSpecs(options.layer, options.sourceId);
  }
  if (options.layer.symbology.type === "line") {
    return [_createLineLayerSpec(options.layer, options.sourceId)];
  }
  if (options.layer.symbology.type === "cluster") {
    return _createClusterLayerSpecs(options.layer, options.sourceId);
  }
  if (options.layer.symbology.type === "heatmap") {
    return [_createHeatmapLayerSpec(options)];
  }
  return [_createCircleLayerSpec(options)];
}

/**
 * Turns one layer plus its data into MapLibre sources and layers.
 *
 * Pure: the same inputs always produce the same JSON, which is what makes
 * paint decisions unit-testable.
 *
 * @param params The layer to render and the data and statistics behind it.
 * @param params.layer The persisted layer, carrying symbology and sensitivity.
 * @param params.featureCollection The layer's features, already converted from
 * query rows.
 * @param params.stats Value domain used by data-driven paint expressions.
 * @param params.valueColumnName Result column backing data-driven point paint,
 * looked up by the caller from the symbology's column id.
 * @returns The sources and layers this one layer contributes to the map spec.
 * @throws SensitivityViolationError when the layer's policy forbids drawing
 * it as individual symbols.
 */
export function makeLayerSpecFromMapLayer({
  layer,
  featureCollection,
  stats,
  valueColumnName,
}: Readonly<MakeLayerSpecFromMapLayerInput>): MapSpec {
  if (
    layer.sensitivity.mode === "aggregateOnly" &&
    layer.symbology.type !== "fill"
  ) {
    throw new SensitivityViolationError("aggregateOnlyLayerSpec", layer.name);
  }

  const sourceId = MapLayerIds.toSourceId(layer.id);
  const layerSpecs = _createMapLayerSpecs({
    layer,
    stats,
    valueColumnName,
    sourceId,
  });

  return {
    sources: {
      [sourceId]:
        layer.symbology.type === "cluster" ?
          {
            type: "geojson",
            data: featureCollection,
            cluster: true,
            clusterRadius: layer.symbology.radiusPx,
            clusterMaxZoom: 14,
          }
        : { type: "geojson", data: featureCollection },
    },
    layers: layerSpecs,
  };
}
