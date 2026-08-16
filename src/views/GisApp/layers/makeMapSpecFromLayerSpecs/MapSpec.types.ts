import type {
  CircleLayerSpecification,
  FillLayerSpecification,
  HeatmapLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

/** A MapLibre GeoJSON source, as plain JSON. */
export type MapSourceSpec = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
};

/**
 * The `circle-radius` paint value: a constant or a data-driven expression.
 * Taken from MapLibre's own circle spec so a malformed expression is a
 * compile error rather than a blank map.
 */
export type CircleRadiusValue = NonNullable<
  NonNullable<CircleLayerSpecification["paint"]>["circle-radius"]
>;

type MapLayerPaint = NonNullable<CircleLayerSpecification["paint"]> &
  NonNullable<LineLayerSpecification["paint"]> &
  NonNullable<FillLayerSpecification["paint"]> &
  NonNullable<HeatmapLayerSpecification["paint"]> &
  NonNullable<SymbolLayerSpecification["paint"]>;

type MapLayerLayout = NonNullable<CircleLayerSpecification["layout"]> &
  NonNullable<LineLayerSpecification["layout"]> &
  NonNullable<FillLayerSpecification["layout"]> &
  NonNullable<HeatmapLayerSpecification["layout"]> &
  NonNullable<SymbolLayerSpecification["layout"]>;

/** A MapLibre layer, as plain JSON. */
export type MapLayerSpec = {
  id: string;
  source: string;
  paint: MapLayerPaint;
  layout?: MapLayerLayout;
  filter?: unknown;
} & (
  | { type: "circle" }
  | { type: "line" }
  | { type: "fill" }
  | { type: "heatmap" }
  | { type: "symbol" }
);

/**
 * Everything a map should be showing, as data. Producing this is pure, so
 * paint decisions are testable without a browser; applying it is `syncMap`'s
 * job.
 */
export type MapSpec = {
  sources: Record<string, MapSourceSpec>;

  /** Draw order, bottom to top. */
  layers: readonly MapLayerSpec[];
};
