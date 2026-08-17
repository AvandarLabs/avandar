import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayerSpatialDiagnostics } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

/** Data returned by either a row-based or DuckDB Spatial map-layer query. */
export type MapLayerDataResult =
  | { type: "rows"; queryResult: QueryResult.T<UnknownRow> }
  | {
      type: "spatial";
      featureCollection: GeoJSON.FeatureCollection;
      diagnostics: MapLayerSpatialDiagnostics;
    };
