import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";

/** Outline applied to a rendered symbol. */
export type StrokeSpec = { width: number; color: string };

/**
 * How feature color is chosen. Only a flat single color exists today;
 * categorical and graduated color arrive with choropleth support.
 */
export type ColorSpec = { type: "single"; color: string };

/**
 * How a layer's geometry is painted. `proportionalSymbol` defaults to `sqrt`
 * scaling so that symbol *area*, not radius, tracks the value: radius-linear
 * scaling visually exaggerates large values.
 */
export type LayerSymbology =
  | {
      type: "circle";
      radius: number;
      color: ColorSpec;
      stroke: StrokeSpec;
    }
  | {
      type: "proportionalSymbol";
      value: QueryColumnId;
      minRadius: number;
      maxRadius: number;
      scale: "sqrt" | "linear";
      color: ColorSpec;
      stroke: StrokeSpec;
    };
