import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayerSpatialDiagnostics } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

/** Data returned by either a row-based or DuckDB Spatial map-layer query. */
export type MapLayerDataResult =
  | {
      type: "rows";
      queryResult: QueryResult.T<UnknownRow>;
      /**
       * True when the large-dataset guard silently capped this row set at
       * `LIMIT 100` with no `ORDER BY`. The rows shown are an arbitrary
       * subset of the full result, not a stable one.
       */
      didAutoLimit: boolean;
    }
  | {
      type: "spatial";
      featureCollection: GeoJSON.FeatureCollection;
      diagnostics: MapLayerSpatialDiagnostics;
    };
