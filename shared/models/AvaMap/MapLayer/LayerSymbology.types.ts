import type { AreaAggregationOutputId } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Outline applied to a rendered symbol. */
export type StrokeSpec = { width: number; color: string };

/**
 * How feature color is chosen. Only a flat single color exists today;
 * categorical and graduated color arrive with choropleth support.
 */
export type LayerValueRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | {
      type: "areaAggregation";
      outputValueId: AreaAggregationOutputId;
    };

/** A numeric value used as the denominator for per-unit normalization. */
export type NormalizationRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | { type: "boundaryColumn"; column: DatasetColumn.Id };

/** Optional per-unit normalization for graduated values. */
export type NormalizationConfig = {
  denominator: NormalizationRef;
  multiplier: 1 | 1_000 | 100_000;
};

/** Automatic classification methods for a graduated color ramp. */
export const AUTOMATIC_CLASSIFICATION_METHODS = [
  "quantile",
  "equalInterval",
  "jenks",
  "standardDeviation",
] as const;
export type AutomaticClassificationMethod =
  (typeof AUTOMATIC_CLASSIFICATION_METHODS)[number];

/** True when `value` is an automatic classification method. */
export function isAutomaticClassificationMethod(
  value: string,
): value is AutomaticClassificationMethod {
  return (AUTOMATIC_CLASSIFICATION_METHODS as readonly string[]).includes(
    value,
  );
}

/** Editable classification settings for a graduated color ramp. */
export type ClassificationConfig =
  | {
      method: AutomaticClassificationMethod;
      classCount: number;
    }
  | { method: "manual"; breaks: readonly number[] };

/** One explicitly colored category. */
export type CategoryColor = { value: string; color: string; label: string };

/** Style used when a feature has no reportable value. */
export type NoDataStyle = { color: string; label: string };

/** How a feature's color is selected from its value. */
export type ColorSpec =
  | { type: "single"; color: string }
  | {
      type: "categorical";
      value: LayerValueRef;
      categories: readonly CategoryColor[];
      other: { color: string; label: string };
      noData: NoDataStyle;
    }
  | {
      type: "graduated";
      value: LayerValueRef;
      ramp: readonly string[];
      classification: ClassificationConfig;
      normalization: NormalizationConfig | undefined;
      noData: NoDataStyle;
    };

/** A flat or value-sized point style. */
export type PointSymbology =
  | {
      type: "circle";
      radius: number;
      color: ColorSpec;
      stroke: StrokeSpec;
    }
  | {
      type: "proportionalSymbol";
      value: QueryColumn.Id;
      minRadius: number;
      maxRadius: number;
      scale: "sqrt" | "linear";
      color: ColorSpec;
      stroke: StrokeSpec;
    };

/** A line geometry's paint settings. */
export type LineSymbology = {
  type: "line";
  color: ColorSpec;
  stroke: StrokeSpec;
};

/** A polygon geometry's fill and outline settings. */
export type FillSymbology = {
  type: "fill";
  color: ColorSpec;
  stroke: StrokeSpec;
  opacity: number;
};

/** A clustered point style with count-driven symbol sizing. */
export type ClusterSymbology = {
  type: "cluster";
  radiusPx: number;
  color: { type: "single"; color: string };
  stroke: StrokeSpec;
};

/** A point-density heatmap style with an optional numeric weight. */
export type HeatmapSymbology = {
  type: "heatmap";
  radiusPx: number;
  weight: QueryColumn.Id | undefined;
  ramp: readonly string[];
};

/**
 * How a layer's geometry is painted. `proportionalSymbol` defaults to `sqrt`
 * scaling so that symbol *area*, not radius, tracks the value: radius-linear
 * scaling visually exaggerates large values.
 */
export type LayerSymbology =
  | PointSymbology
  | LineSymbology
  | FillSymbology
  | ClusterSymbology
  | HeatmapSymbology;
