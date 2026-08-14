import { matchLiteral } from "@avandar/utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { LayerStats } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import type {
  CircleRadiusValue,
  MapLayerSpec,
  MapSpec,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ExpressionSpecification } from "maplibre-gl";

/** Highlight applied to the feature the user has selected. */
const SELECTED_STROKE_COLOR = "#ffd700";

type ProportionalSymbol = Extract<
  MapLayer.Symbology,
  { type: "proportionalSymbol" }
>;

/** Applies the selected scale to a numeric span. */
function _getScaledSpan(
  scale: ProportionalSymbol["scale"],
  span: number,
): number {
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
    _getScaledSpan(symbology.scale, maximum - minimum),
    symbology.maxRadius,
  ];
}

/** Creates the MapLibre circle layer for one persisted map layer. */
function _createMapLayerSpec({
  layer,
  stats,
  valueColumnName,
  sourceId,
}: {
  layer: MapLayer.T;
  stats: LayerStats;
  valueColumnName: string | undefined;
  sourceId: string;
}): MapLayerSpec {
  const { symbology } = layer;
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
      "circle-color": symbology.color.color,
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
 * @param params.valueColumnName Result column backing a proportional symbol,
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
}: {
  layer: MapLayer.T;
  featureCollection: GeoJSON.FeatureCollection;
  stats: LayerStats;
  valueColumnName?: string;
}): MapSpec {
  if (layer.sensitivity.mode === "aggregateOnly") {
    throw new SensitivityViolationError(
      `Layer "${layer.name}" is aggregate-only and cannot be drawn as individual symbols.`,
    );
  }

  const sourceId = MapLayerIds.toSourceId(layer.id);
  const layerSpec = _createMapLayerSpec({
    layer,
    stats,
    valueColumnName,
    sourceId,
  });

  return {
    sources: { [sourceId]: { type: "geojson", data: featureCollection } },
    layers: [layerSpec],
  };
}
