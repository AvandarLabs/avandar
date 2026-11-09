import { corsHeaders } from "@sbfn/_shared/cors.ts";
import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import {
  markColumnTypeSampleUnparseable,
  markListingInvalid,
  respondWithColumnTypeSample,
  UnparseableSampleBodySchema,
  VerifiedColumnTypesBodySchema,
  writeVerifiedColumnTypes,
} from "@sbfn/open-data/columnTypeVerification/columnTypeVerification.ts";
import {
  parquetCacheAnswerToStatus,
  requestParquetCache,
} from "@sbfn/open-data/requestParquetCache/requestParquetCache.ts";
import { respondWithSampleFailure } from "@sbfn/open-data/respondWithSampleFailure/respondWithSampleFailure.ts";
import {
  readPipelineServerTarget,
  startParquetCopyBuild,
} from "@sbfn/open-data/startParquetCopyBuild/startParquetCopyBuild.ts";
import { object, string } from "zod";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readOpenDataFreshnessToken } from "$/connectors/open-data/readOpenDataFreshnessToken/readOpenDataFreshnessToken.ts";
import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { OpenDataAPI } from "@sbfn/open-data/OpenDataRoutes.types.ts";
import type { ParquetCacheDependencies } from "@sbfn/open-data/requestParquetCache/requestParquetCache.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The largest metadata response the freshness check reads. */
const MAX_FRESHNESS_RESPONSE_BYTES = 10 * 1024 * 1024;

/**
 * How long a build may run before a request treats it as lost and claims
 * the listing again. Builds of the largest sources take longer, so this is a
 * floor for retrying, not a limit on a build.
 */
const LOST_BUILD_AFTER = "30 minutes";

/**
 * Records a freshness token the `parquet-cache` route just read from a
 * listing's source, so its requests in the next few minutes reuse it. Written
 * with the admin client, since only the service role may record a check.
 */
async function _recordFreshnessCheck(
  catalogListingId: string,
  sourceVersion: string,
): Promise<void> {
  const { error } = await SupabaseAdmin.rpc(
    "rpc_data_catalog_listings__record_freshness_check",
    {
      p_catalog_listing_id: catalogListingId,
      p_source_version: sourceVersion,
    },
  );
  if (error) {
    throw error;
  }
}

/**
 * Wires a copy request to its listing's freshness check, the build claim,
 * and the pipeline server. Claims and failures are written with the admin
 * client, after the caller's own read showed they may see the listing.
 */
function _createParquetCacheDependencies(
  entry: Readonly<DataCatalogListing.T>,
): ParquetCacheDependencies {
  const target = readPipelineServerTarget((name) => {
    return Deno.env.get(name);
  });
  const http = HttpClientFactory.create("OpenDataRouteHttpClient", {
    state: { maxResponseBytes: MAX_FRESHNESS_RESPONSE_BYTES },
  });
  return {
    canStartBuilds: target !== undefined,
    readFreshnessToken: () => {
      return readOpenDataFreshnessToken({ entry, http });
    },
    claimBuild: async () => {
      const { data, error } = await SupabaseAdmin.rpc(
        "rpc_data_catalog_listings__request_parquet_cache",
        {
          p_catalog_listing_id: entry.id,
          p_lost_build_after: LOST_BUILD_AFTER,
        },
      );
      if (error) {
        throw error;
      }
      return data ?? undefined;
    },
    startBuild: async (buildId) => {
      if (target === undefined) {
        throw new Error("No pipeline server is configured.");
      }
      await startParquetCopyBuild({
        target,
        catalogListingId: entry.id,
        buildId,
      });
    },
    recordStartFailure: async (buildId, failureCode) => {
      const { error } = await SupabaseAdmin.rpc(
        "rpc_data_catalog_listings__fail_parquet_cache",
        {
          p_catalog_listing_id: entry.id,
          p_build_id: buildId,
          p_failure_code: failureCode,
        },
      );
      if (error) {
        throw error;
      }
    },
    recordFreshnessCheck: (sourceVersion) => {
      return _recordFreshnessCheck(entry.id, sourceVersion);
    },
    now: () => {
      return new Date();
    },
  };
}

/**
 * Reads one catalog listing as the caller, so RLS decides whether they may
 * see it.
 *
 * @returns The listing, or a 404 response when there is none to see.
 */
async function _readCatalogListing(
  supabaseClient: SupabaseClient,
  catalogListingId: string,
): Promise<DataCatalogListing.T | Response> {
  const { data, error } = await supabaseClient
    .from("data_catalog_listings")
    .select("*")
    .eq("id", catalogListingId)
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
  return DataCatalogListingParsers.fromDBReadToModelRead(
    DataCatalogListingParsers.DBReadSchema.parse(data),
  );
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
  "/data-catalog-listings/:catalogListingId/column-type-sample": {
    GET: GET({
      path: "/data-catalog-listings/:catalogListingId/column-type-sample",
      schema: { catalogListingId: string().uuid() },
    }).action(async ({ pathParams, supabaseClient }): Promise<Response> => {
      const entry = await _readCatalogListing(
        supabaseClient,
        pathParams.catalogListingId,
      );
      if (entry instanceof Response) {
        return entry;
      }
      try {
        return await respondWithColumnTypeSample(entry);
      } catch (caught) {
        if (OpenDataAcquisitionFailed.is(caught)) {
          return await respondWithSampleFailure({
            catalogListingId: entry.id,
            error: caught,
            markInvalid: markListingInvalid,
          });
        }
        throw caught;
      }
    }),
  },
  "/data-catalog-listings/:catalogListingId/column-types": {
    POST: POST({
      path: "/data-catalog-listings/:catalogListingId/column-types",
      schema: { catalogListingId: string().uuid() },
    })
      .bodySchema(VerifiedColumnTypesBodySchema)
      .action(
        async ({ pathParams, body, supabaseClient }): Promise<Response> => {
          // Read as the caller first, so only a listing they can see is
          // written.
          const entry = await _readCatalogListing(
            supabaseClient,
            pathParams.catalogListingId,
          );
          if (entry instanceof Response) {
            return entry;
          }
          return await writeVerifiedColumnTypes({
            catalogListingId: entry.id,
            body,
          });
        },
      ),
  },
  "/data-catalog-listings/:catalogListingId/parquet-cache": {
    POST: POST({
      path: "/data-catalog-listings/:catalogListingId/parquet-cache",
      schema: { catalogListingId: string().uuid() },
    })
      // Every POST here parses a JSON body, so the caller sends `{}`.
      .bodySchema(object({}).strict())
      .action(async ({ pathParams, supabaseClient }): Promise<Response> => {
        // Read as the caller first, so only a listing they can see is built.
        const entry = await _readCatalogListing(
          supabaseClient,
          pathParams.catalogListingId,
        );
        if (entry instanceof Response) {
          return entry;
        }
        const answer = await requestParquetCache({
          listing: entry,
          deps: _createParquetCacheDependencies(entry),
        });
        return new Response(JSON.stringify(answer), {
          status: parquetCacheAnswerToStatus(answer),
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }),
  },
  "/data-catalog-listings/:catalogListingId/unparseable": {
    POST: POST({
      path: "/data-catalog-listings/:catalogListingId/unparseable",
      schema: { catalogListingId: string().uuid() },
    })
      .bodySchema(UnparseableSampleBodySchema)
      .action(
        async ({ pathParams, body, supabaseClient }): Promise<Response> => {
          // Read as the caller first, so only a listing they can see is
          // marked.
          const entry = await _readCatalogListing(
            supabaseClient,
            pathParams.catalogListingId,
          );
          if (entry instanceof Response) {
            return entry;
          }
          return await markColumnTypeSampleUnparseable({
            catalogListingId: entry.id,
            body,
          });
        },
      ),
  },
});
