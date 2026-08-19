import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayerSpatialDiagnostics } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types";
import type {
  PointAggregation,
  PointCoordinateAudit,
} from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.types";
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

      /**
       * Row counts measured in SQL, present for a lat/lng point layer.
       *
       * Carried separately from the rows because an aggregated layer's rows are
       * cells rather than source rows, so the layer's "rows mapped" status can
       * only stay honest by reading counts that were taken before aggregation.
       */
      audit?: PointCoordinateAudit;

      /**
       * How DuckDB reduced the layer before returning it. Present only when the
       * rows are aggregated cells rather than source rows.
       */
      aggregation?: PointAggregation;
    }
  | {
      type: "spatial";
      featureCollection: GeoJSON.FeatureCollection;
      diagnostics: MapLayerSpatialDiagnostics;
    };
