import { matchLiteral } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { makeClusterLayerSpecsFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeClusterLayerSpecsFromMapLayer";
import { makeColorExpressionFromColor } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeColorExpressionFromColor";
import { makeFillLayerSpecsFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeFillLayerSpecsFromMapLayer";
import { makeHeatmapLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeHeatmapLayerSpecFromMapLayer";
import {
  CLUSTER_AUTO_THRESHOLD,
  SELECTED_STROKE_COLOR,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type { CreateMapLayerSpecInput } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.types";
import type {
  CircleRadiusValue,
  MapLayerSpec,
  MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { ExpressionSpecification } from "maplibre-gl";

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
function _buildCircleLayerSpec({
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
      "circle-color": makeColorExpressionFromColor(symbology.color),
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
function _buildLineLayerSpec(options: {
  layer: MapLayer.T;
  sourceId: string;
}): MapLayerSpec {
  const { layer, sourceId } = options;
  const symbology = layer.symbology;
  if (symbology.type !== "line") {
    throw new Error("Line symbology is required");
  }
  return {
    id: MapLayerIds.toLayerId(layer.id),
    type: "line",
    source: sourceId,
    paint: {
      "line-color": makeColorExpressionFromColor(symbology.color),
      "line-width": symbology.stroke.width,
    },
    ...(layer.isVisible ? {} : { layout: { visibility: "none" } }),
  };
}

/** Makes the paint layers matching the configured geometry symbology. */
function _makeMapLayerSpecs(
  options: Readonly<CreateMapLayerSpecInput>,
): MapLayerSpec[] {
  return matchLiteral(options.layer.symbology.type, {
    fill: () => {
      return makeFillLayerSpecsFromMapLayer({
        layer: options.layer,
        sourceId: options.sourceId,
      });
    },
    line: () => {
      return [
        _buildLineLayerSpec({
          layer: options.layer,
          sourceId: options.sourceId,
        }),
      ];
    },
    cluster: () => {
      const { symbology } = options.layer;
      if (symbology.type !== "cluster") {
        throw new Error("Cluster symbology is required");
      }
      return makeClusterLayerSpecsFromMapLayer({
        layer: options.layer,
        sourceId: options.sourceId,
        paint: { color: symbology.color.color, stroke: symbology.stroke },
      });
    },
    heatmap: () => {
      return [makeHeatmapLayerSpecFromMapLayer(options)];
    },
    circle: () => {
      return [_buildCircleLayerSpec(options)];
    },
    proportionalSymbol: () => {
      return [_buildCircleLayerSpec(options)];
    },
  });
}

/** True for the two point symbologies eligible to auto-cluster. */
function _isAutoClusterableSymbology(
  symbology: MapLayer.Symbology,
): symbology is Extract<
  MapLayer.Symbology,
  { type: "circle" | "proportionalSymbol" }
> {
  return symbology.type === "circle" || symbology.type === "proportionalSymbol";
}

/**
 * Builds cluster paint from a point layer's own color and stroke, since an
 * auto-clustered layer has no `cluster` symbology to read paint from. This
 * only reads the layer's symbology; it never writes back to it, so the
 * user's chosen circle or proportional-symbol styling survives switching
 * zoom levels or feature counts.
 */
function _getAutoClusterPaint(
  symbology: Extract<
    MapLayer.Symbology,
    { type: "circle" | "proportionalSymbol" }
  >,
) {
  return {
    color: makeColorExpressionFromColor(symbology.color),
    stroke: symbology.stroke,
  };
}

/**
 * Turns one layer plus its data into MapLibre sources and layers.
 *
 * Pure: the same inputs always produce the same JSON, which is what makes
 * paint decisions unit-testable. A `circle` or `proportionalSymbol` layer
 * renders clustered once its feature count passes
 * {@link CLUSTER_AUTO_THRESHOLD}, without changing the persisted symbology:
 * clustering here is a rendering decision, made fresh on every call.
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

  const { symbology } = layer;
  const autoClusterPaint =
    (
      _isAutoClusterableSymbology(symbology) &&
      featureCollection.features.length > CLUSTER_AUTO_THRESHOLD
    ) ?
      _getAutoClusterPaint(symbology)
    : undefined;

  const sourceId = MapLayerIds.toSourceId(layer.id);
  const layerSpecs =
    autoClusterPaint !== undefined ?
      makeClusterLayerSpecsFromMapLayer({
        layer,
        sourceId,
        paint: autoClusterPaint,
      })
    : _makeMapLayerSpecs({ layer, stats, valueColumnName, sourceId });

  return {
    sources: {
      [sourceId]:
        symbology.type === "cluster" || autoClusterPaint !== undefined ?
          {
            type: "geojson",
            data: featureCollection,
            cluster: true,
            clusterRadius:
              symbology.type === "cluster" ?
                symbology.radiusPx
              : MapLayer.defaultClusterRadiusPx,
            clusterMaxZoom: 14,
          }
        : { type: "geojson", data: featureCollection },
    },
    layers: layerSpecs,
  };
}
