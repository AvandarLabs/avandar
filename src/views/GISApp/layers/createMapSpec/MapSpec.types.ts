/** A MapLibre GeoJSON source, as plain JSON. */
export type MapSourceSpec = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
};

/** A MapLibre layer, as plain JSON. */
export type MapLayerSpec = {
  id: string;
  type: "circle";
  source: string;
  paint: Record<string, unknown>;
  layout?: Record<string, unknown>;
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
