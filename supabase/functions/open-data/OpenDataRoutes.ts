import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import { statusFromOpenDataFailure } from "@sbfn/open-data/statusFromOpenDataFailure/statusFromOpenDataFailure.ts";
import { string } from "zod";
import { acquireOpenDataResource } from "$/connectors/open-data/acquireOpenDataResource.ts";
import { acquireOpenDataResourceWithCache } from "$/connectors/open-data/acquireOpenDataResourceWithCache/acquireOpenDataResourceWithCache.ts";
import { createAvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.ts";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readOpenDataFreshnessToken } from "$/connectors/open-data/readOpenDataFreshnessToken/readOpenDataFreshnessToken.ts";
import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
import type { OpenDataAcquisition } from "$/connectors/open-data/acquireOpenDataResource.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
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
 * Writes a freshly fetched resource's cache location and source version back
 * onto its catalog listing. The sole `updateCache` implementation
 * `acquireOpenDataResourceWithCache` is given, so a cache write only happens
 * through the catalog-entry update it performs.
 */
async function _persistOpenDataCache(params: {
  catalogListingId: DataCatalogListing.Id;
  cachedObjectPath: string;
  cachedSourceVersion: string;
}): Promise<void> {
  const { error: updateError } = await SupabaseAdmin.from(
    "data_catalog_listings",
  )
    .update({
      cached_object_path: params.cachedObjectPath,
      cached_source_version: params.cachedSourceVersion,
      cached_at: new Date().toISOString(),
    })
    .eq("id", params.catalogListingId);
  if (updateError) {
    throw updateError;
  }
}

/**
 * Resolves one catalog listing's resource bytes through the cache-aside path:
 * builds the HTTP and storage clients the acquisition needs, then wires them
 * into `acquireOpenDataResourceWithCache` along with the freshness check,
 * the live fetch, and the cache-persist callback.
 */
async function _resolveOpenDataAcquisition(
  entry: Readonly<DataCatalogListing.T>,
): Promise<OpenDataAcquisition> {
  const http = createOpenDataHttp({ maxBytes: MAX_RESOURCE_BYTES });
  const storage = createAvandarSupabaseStorageClient(
    SupabaseAdmin.storage.from("open-data-catalog"),
  );

  return acquireOpenDataResourceWithCache({
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
    updateCache: _persistOpenDataCache,
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
 * The caller sends a catalog listing id and nothing else. It never sends a URL:
 * the API root comes from the catalog row, the resource URL comes from CKAN's
 * own response, and `getCkanResourceFromPackage` refuses a resource URL whose
 * host is not the catalogued one. That chain is what keeps this from being an
 * open relay for arbitrary server-side requests.
 */
export const OpenDataRoutes = defineRoutes<OpenDataAPI>("open-data", {
  "/data-catalog-listings/:catalogListingId/resource": {
    GET: GET({
      path: "/data-catalog-listings/:catalogListingId/resource",
      schema: { catalogListingId: string().uuid() },
    }).action(async ({ pathParams, supabaseClient }): Promise<Response> => {
      const { data, error } = await supabaseClient
        .from("data_catalog_listings")
        .select("*")
        .eq("id", pathParams.catalogListingId)
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

      const entry = DataCatalogListingParsers.fromDBReadToModelRead(
        DataCatalogListingParsers.DBReadSchema.parse(data),
      );

      try {
        const acquisition = await _resolveOpenDataAcquisition(entry);

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
