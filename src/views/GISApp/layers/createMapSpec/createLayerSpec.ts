import { SensitivityViolationError } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";
import type { LayerStats } from "@/views/GISApp/layers/computeLayerStats/computeLayerStats";
import type {
  MapLayerSpec,
  MapSpec,
} from "@/views/GISApp/layers/createMapSpec/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Highlight applied to the feature the user has selected. */
const SELECTED_STROKE_COLOR = "#ffd700";

/** Builds the MapLibre source id for a layer. */
export function buildSourceId(layerId: string): string {
  return `ava-map-source-${layerId}`;
}

/** Builds the MapLibre layer id for a layer. */
export function buildLayerId(layerId: string): string {
  return `ava-map-layer-${layerId}`;
}

/**
 * Builds the `circle-radius` value. A flat circle is a constant; a
 * proportional symbol interpolates on the square root of the value so that
 * symbol area, not radius, tracks the number.
 */
function _buildCircleRadius({
  symbology,
  stats,
  valueColumnName,
}: {
  symbology: MapLayer.T["symbology"];
  stats: LayerStats;
  valueColumnName: string | undefined;
}): unknown {
  if (symbology.type === "circle") {
    return symbology.radius;
  }
  const { valueDomain } = stats;
  if (!valueColumnName || !valueDomain || valueDomain[0] === valueDomain[1]) {
    return symbology.minRadius;
  }
  const [minimum, maximum] = valueDomain;
  const scaleValue =
    symbology.scale === "sqrt" ?
      (span: number) => {
        return Math.sqrt(span);
      }
    : (span: number) => {
        return span;
      };
  const normalized = [
    "max",
    0,
    ["-", ["to-number", ["get", valueColumnName], 0], minimum],
  ];
  return [
    "interpolate",
    ["linear"],
    symbology.scale === "sqrt" ? ["sqrt", normalized] : normalized,
    0,
    symbology.minRadius,
    scaleValue(maximum - minimum),
    symbology.maxRadius,
  ];
}

/**
 * Turns one layer plus its data into MapLibre sources and layers.
 *
 * Pure: the same inputs always produce the same JSON, which is what makes
 * paint decisions unit-testable.
 *
 * @param params.valueColumnName Result column backing a proportional symbol,
 * resolved by the caller from the symbology's column id.
 * @throws SensitivityViolationError when the layer's policy forbids drawing
 * it as individual symbols.
 */
export function createLayerSpec({
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
      `Layer "${layer.name}" is aggregate-only and cannot be drawn as ` +
        "individual symbols.",
    );
  }

  const sourceId = buildSourceId(layer.id);
  const { symbology } = layer;
  const layerSpec: MapLayerSpec = {
    id: buildLayerId(layer.id),
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

  return {
    sources: { [sourceId]: { type: "geojson", data: featureCollection } },
    layers: [layerSpec],
  };
}
