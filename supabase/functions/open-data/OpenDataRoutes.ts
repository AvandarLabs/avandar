import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import { statusFromOpenDataFailure } from "@sbfn/open-data/statusFromOpenDataFailure/statusFromOpenDataFailure.ts";
import { string } from "zod";
import { OpenDataCatalogEntryParsers } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts";
import { acquireOpenDataResource } from "$/connectors/open-data/acquireOpenDataResource.ts";
import { acquireOpenDataResourceWithCache } from "$/connectors/open-data/acquireOpenDataResourceWithCache.ts";
import { createAvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.ts";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readOpenDataFreshnessToken } from "$/connectors/open-data/readOpenDataFreshnessToken.ts";
import type { OpenDataAPI } from "@sbfn/open-data/OpenDataRoutes.types.ts";

/**
 * The largest resource this route will relay. Kept well under the response size
 * a Supabase edge function can return, and deliberately smaller than the
 * largest resources HDX hosts, so an oversized dataset is refused with a clear
 * reason rather than by the runtime killing the invocation.
 */
const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;

/**
 * Headers the browser is allowed to read off the response. Without this the
 * fetch succeeds and both custom headers are invisible, because a cross-origin
 * response exposes only the CORS-safelisted set.
 */
const EXPOSED_HEADERS = "X-Ava-Content-Kind, X-Ava-Source-Version";

function _responseFromFailure(error: OpenDataAcquisitionFailed): Response {
  return new Response(JSON.stringify({ error: { code: error.failure.code } }), {
    status: statusFromOpenDataFailure(error.failure.code),
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Reads open data sources described by Avandar's catalog.
 *
 * This route exists because a browser cannot read a CKAN resource itself. CKAN
 * serves its `/api/3/action/*` responses with `access-control-allow-origin: *`,
 * but answers a resource download with a redirect whose
 * `access-control-allow-origin` names only the CKAN host, so the bytes are
 * unreachable from any other origin. Server-side there is no such restriction.
 *
 * The caller sends a catalog entry id and nothing else. It never sends a URL:
 * the API root comes from the catalog row, the resource URL comes from CKAN's
 * own response, and `getCkanResourceFromPackage` refuses a resource URL whose
 * host is not the catalogued one. That chain is what keeps this from being an
 * open relay for arbitrary server-side requests.
 */
export const OpenDataRoutes = defineRoutes<OpenDataAPI>("open-data", {
  "/catalog-entries/:catalogEntryId/resource": {
    GET: GET({
      path: "/catalog-entries/:catalogEntryId/resource",
      schema: { catalogEntryId: string().uuid() },
    }).action(async ({ pathParams, supabaseClient }): Promise<Response> => {
      const { data, error } = await supabaseClient
        .from("catalog_entries__open_data")
        .select("*")
        .eq("id", pathParams.catalogEntryId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        return new Response(
          JSON.stringify({ error: { code: "catalog-entry-not-found" } }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const entry = OpenDataCatalogEntryParsers.fromDBReadToModelRead(
        OpenDataCatalogEntryParsers.DBReadSchema.parse(data),
      );

      try {
        const http = createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES });
        const storage = createAvandarSupabaseStorageClient(
          SupabaseAdmin.storage.from("open-data-catalog"),
        );

        const acquisition = await acquireOpenDataResourceWithCache({
          entry,
          readFreshnessToken: (freshnessEntry) => {
            return readOpenDataFreshnessToken({ entry: freshnessEntry, http });
          },
          acquireLive: (liveEntry) => {
            return acquireOpenDataResource({
              entry: liveEntry,
              http,
              maxBytes: MAX_RESOURCE_BYTES,
            });
          },
          storage,
          updateCache: async ({
            catalogEntryId,
            cachedObjectPath,
            cachedSourceVersion,
          }) => {
            const { error: updateError } = await SupabaseAdmin.from(
              "catalog_entries__open_data",
            )
              .update({
                cached_object_path: cachedObjectPath,
                cached_source_version: cachedSourceVersion,
                cached_at: new Date().toISOString(),
              })
              .eq("id", catalogEntryId);
            if (updateError) {
              throw updateError;
            }
          },
        });

        return new Response(acquisition.bytes as BodyInit, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Access-Control-Expose-Headers": EXPOSED_HEADERS,
            "Content-Type": "application/octet-stream",
            "X-Ava-Content-Kind": acquisition.contentKind,
            ...(acquisition.sourceVersion === undefined
              ? {}
              : { "X-Ava-Source-Version": acquisition.sourceVersion }),
          },
        });
      } catch (caught) {
        if (OpenDataAcquisitionFailed.is(caught)) {
          return _responseFromFailure(caught);
        }
        throw caught;
      }
    }),
  },
});
