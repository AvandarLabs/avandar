import type { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types.ts";

/**
 * How a layer's rows become geometry.
 *
 * `latLngColumns` deliberately compiles to no DuckDB `ST_*` call, so a point
 * map keeps working when the optional `spatial` extension is unavailable.
 * Bindings that do need geometry functions (boundary joins, binning) are added
 * as further members of this union.
 */
export type GeoBinding = {
  type: "latLngColumns";
  latitude: QueryColumnId;
  longitude: QueryColumnId;
};

/**
 * A {@link GeoBinding} whose column ids have been resolved to the column names
 * that query result rows are actually keyed by.
 */
export type ResolvedGeoBinding = {
  type: "latLngColumns";
  latitudeColumnName: string;
  longitudeColumnName: string;
};
