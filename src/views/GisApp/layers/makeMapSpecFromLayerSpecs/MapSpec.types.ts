import type { CircleLayerSpecification } from "maplibre-gl";

/** A MapLibre GeoJSON source, as plain JSON. */
export type MapSourceSpec = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
};

/**
 * The `circle-radius` paint value: a constant or a data-driven expression.
 * Taken from MapLibre's own circle spec so a malformed expression is a
 * compile error rather than a blank map.
 */
export type CircleRadiusValue = NonNullable<
  NonNullable<CircleLayerSpecification["paint"]>["circle-radius"]
>;

/** A MapLibre layer, as plain JSON. */
export type MapLayerSpec = {
  id: string;
  type: "circle";
  source: string;
  paint: NonNullable<CircleLayerSpecification["paint"]>;
  layout?: CircleLayerSpecification["layout"];
};

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
