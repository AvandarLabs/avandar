import type { ComponentType } from "react";
export type ProductFeature =
  | "import"
  | "explorer"
  | "dashboards"
  | "cases"
  | "map"
  | "ontology"
  | "attribute-mapping";
export type ProductBeat = { frame: number; target: string; action: string };
export const AvandarStage: ComponentType<{
  feature: ProductFeature;
  frame: number;
  width?: number;
  height?: number;
  mode?: string;
}>;
export const FEATURE_BEATS: Record<ProductFeature, ProductBeat[]>;
