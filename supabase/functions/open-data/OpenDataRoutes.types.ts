import type { Enums } from "$/types/database.types.ts";
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/**
 * Routes for reading open data sources Avandar's catalog describes.
 *
 * The column type sample route answers with CSV text rather than JSON, which
 * is why its `returnType` is `Response`. The column types and Parquet cache
 * routes build their own JSON `Response` too, so each answer carries its own
 * status.
 */
export type OpenDataAPI = APITypeDef<
  "open-data",
  [
    "/data-catalog-listings/:catalogListingId/column-type-sample",
    "/data-catalog-listings/:catalogListingId/column-types",
    "/data-catalog-listings/:catalogListingId/unparseable",
    "/data-catalog-listings/:catalogListingId/parquet-cache",
  ],
  {
    "/data-catalog-listings/:catalogListingId/column-type-sample": {
      GET: {
        returnType: Response;
        pathParams: { catalogListingId: string };
      };
    };
    "/data-catalog-listings/:catalogListingId/column-types": {
      POST: {
        returnType: Response;
        pathParams: { catalogListingId: string };
        body: {
          token: string;
          columns: Array<{
            name: string;
            dataType: Enums<"datasets__duckdb_data_type">;
          }>;
        };
      };
    };
    "/data-catalog-listings/:catalogListingId/unparseable": {
      POST: {
        returnType: Response;
        pathParams: { catalogListingId: string };
        body: { token: string };
      };
    };
    "/data-catalog-listings/:catalogListingId/parquet-cache": {
      POST: {
        returnType: Response;
        pathParams: { catalogListingId: string };
        /**
         * A complete column type sample and its token, when the caller holds
         * one, so the copy is built from it instead of the source.
         */
        body: { completeSample?: { token: string; csvText: string } };
      };
    };
  }
>;
