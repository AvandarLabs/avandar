import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/**
 * How a layer's rows become geometry.
 *
 * `latLngColumns` deliberately compiles to no DuckDB `ST_*` call, so a point
 * map keeps working when the optional `spatial` extension is unavailable.
 * Bindings that do need geometry functions (boundary joins, binning) are added
 * as further members of this union.
 *
 * `latitude` and `longitude` are independently optional so that picking one
 * axis alone never yields usable column names: a half-picked binding that
 * still produced geometry would plot points on the diagonal where latitude
 * equals longitude, which looks like a real result and is not.
 */
export type GeoBinding = {
  type: "latLngColumns";
  latitude: QueryColumn.Id | undefined;
  longitude: QueryColumn.Id | undefined;
};

/**
 * A {@link GeoBinding} whose column ids have been replaced with the column
 * names that query result rows are actually keyed by.
 */
export type GeoBindingColumnNames = {
  type: "latLngColumns";
  latitudeColumnName: string;
  longitudeColumnName: string;
};
