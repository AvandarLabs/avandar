import type { Enums } from "$/types/database.types.ts";
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/**
 * Routes for reading open data sources Avandar's catalog describes.
 *
 * The resource route answers with the resource's raw bytes rather than JSON,
 * which is why its `returnType` is `Response`. A CKAN resource is a file of
 * arbitrary size, and `responseSuccess` would have to base64 it into a JSON
 * envelope at a 33% cost. The column type sample route answers with CSV text
 * the same way, and the column types route builds its own JSON `Response`
 * so each failure carries its own status and code.
 */
export type OpenDataAPI = APITypeDef<
  "open-data",
  [
    "/data-catalog-listings/:catalogListingId/resource",
    "/data-catalog-listings/:catalogListingId/column-type-sample",
    "/data-catalog-listings/:catalogListingId/column-types",
  ],
  {
    "/data-catalog-listings/:catalogListingId/resource": {
      GET: {
        returnType: Response;
        pathParams: { catalogListingId: string };
      };
    };
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
  }
>;
