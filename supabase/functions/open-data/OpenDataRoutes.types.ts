import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/**
 * Routes for reading open data sources Avandar's catalog describes.
 *
 * The resource route answers with the resource's raw bytes rather than JSON,
 * which is why its `returnType` is `Response`. A CKAN resource is a file of
 * arbitrary size, and `responseSuccess` would have to base64 it into a JSON
 * envelope at a 33% cost.
 */
export type OpenDataAPI = APITypeDef<
  "open-data",
  ["/catalog-entries/:catalogEntryId/resource"],
  {
    "/catalog-entries/:catalogEntryId/resource": {
      GET: {
        returnType: Response;
        pathParams: { catalogEntryId: string };
      };
    };
  }
>;
