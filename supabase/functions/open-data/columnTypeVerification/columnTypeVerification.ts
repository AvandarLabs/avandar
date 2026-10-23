import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import {
  isColumnTypeSampleTokenValid,
  signColumnTypeSampleToken,
} from "@sbfn/open-data/columnTypeSampleToken/columnTypeSampleToken.ts";
import { gzipBytes } from "@sbfn/open-data/gzipBytes/gzipBytes.ts";
import { createByteRangeReader } from "@sbfn/open-data/readByteRangeOverHttp/readByteRangeOverHttp.ts";
import { z } from "zod";
import { acquireOpenDataColumnTypeSample } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import { Constants } from "$/types/database.types.ts";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import type { MarkListingInvalid } from "@sbfn/open-data/respondWithSampleFailure/respondWithSampleFailure.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

/** The largest response a sample's metadata or Socrata rows may be. */
const MAX_SAMPLE_RESPONSE_BYTES = 25 * 1024 * 1024;

/** The header the sample route returns its token in. */
export const COLUMN_TYPE_TOKEN_HEADER = "X-Ava-Column-Type-Token";

/** The body the column types route accepts. */
export const VerifiedColumnTypesBodySchema = z.object({
  token: z.string().min(1).max(4096),
  columns: z
    .array(
      z.object({
        name: z.string(),
        dataType: z.enum(Constants.public.Enums.datasets__duckdb_data_type),
      }),
    )
    .min(1)
    .max(5000),
});

/** The body the unparseable route accepts: the sample's token. */
export const UnparseableSampleBodySchema = z.object({
  token: z.string().min(1).max(4096),
});

function _getSigningSecret(): string {
  const secret = Deno.env.get("SB_SECRET_KEY");
  if (!secret) {
    throw new Error("SB_SECRET_KEY is not set");
  }
  return secret;
}

function _jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function _isTokenValid(args: {
  token: string;
  catalogListingId: string;
}): Promise<boolean> {
  return await isColumnTypeSampleTokenValid({
    token: args.token,
    catalogListingId: args.catalogListingId,
    secret: _getSigningSecret(),
    now: Date.now(),
  });
}

function _respondWithInvalidToken(): Response {
  return _jsonResponse(409, {
    error: { code: "column-type-sample-token-invalid" },
  });
}

/** Marks a listing invalid through the service role's RPC. */
export const markListingInvalid: MarkListingInvalid = async ({
  catalogListingId,
  reason,
}) => {
  const { error } = await SupabaseAdmin.rpc(
    "rpc_data_catalog_listings__mark_invalid",
    { p_catalog_listing_id: catalogListingId, p_reason: reason },
  );
  if (error) {
    throw error;
  }
};

/**
 * Answers with the start of a listing's real data, gzipped and otherwise
 * untouched, and a token in `X-Ava-Column-Type-Token` proving the caller
 * read it. Nothing here parses the sample: the browser's DuckDB reads it as
 * CSV, so a file with an unusual delimiter, a blank header cell, or stray
 * quoting gets DuckDB's handling, not a hand-written parser's. The browser
 * sends the types back with the token to `writeVerifiedColumnTypes`.
 *
 * @throws `OpenDataAcquisitionFailed` when the sample cannot be read.
 */
export async function respondWithColumnTypeSample(
  entry: Readonly<DataCatalogListing.T>,
): Promise<Response> {
  const sample = await acquireOpenDataColumnTypeSample({
    entry,
    http: HttpClientFactory.create("OpenDataColumnTypeSampleHttpClient", {
      state: { maxResponseBytes: MAX_SAMPLE_RESPONSE_BYTES },
    }),
    readByteRange: createByteRangeReader(),
  });
  const token = await signColumnTypeSampleToken({
    catalogListingId: entry.id,
    secret: _getSigningSecret(),
    now: Date.now(),
  });
  return new Response(await gzipBytes(sample.bytes), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Access-Control-Expose-Headers": COLUMN_TYPE_TOKEN_HEADER,
      "Content-Encoding": "gzip",
      "Content-Type": "text/csv",
      [COLUMN_TYPE_TOKEN_HEADER]: token,
    },
  });
}

/**
 * Writes column types the browser inferred from a sample this function
 * served, once the token shows the caller read a sample of this listing.
 * The browser's DuckDB names the columns, so the names are trusted as its
 * types are. Answers 409 with `column-type-sample-token-invalid` when the
 * token is expired, forged, or for another listing.
 *
 * Trusting the browser at all is temporary: once DuckDB can run
 * server-side, the server should read the sample and infer the types
 * itself.
 */
export async function writeVerifiedColumnTypes(args: {
  catalogListingId: string;
  body: z.infer<typeof VerifiedColumnTypesBodySchema>;
}): Promise<Response> {
  if (!(await _isTokenValid({ ...args, token: args.body.token }))) {
    return _respondWithInvalidToken();
  }
  const { data, error } = await SupabaseAdmin.rpc(
    "rpc_data_catalog_listings__write_verified_column_types",
    {
      p_catalog_listing_id: args.catalogListingId,
      p_columns: args.body.columns.map((column) => {
        return { column_name: column.name, cast_data_type: column.dataType };
      }),
    },
  );
  if (error) {
    throw error;
  }
  return _jsonResponse(200, {
    dateColumnTypeLastVerified: data.date_column_type_last_verified,
  });
}

/**
 * Marks a listing `unparseable_dataset` when the browser's DuckDB could not
 * read a sample this function served, once the token shows the caller read
 * one. Answers 409 with `column-type-sample-token-invalid` when it did not.
 */
export async function markColumnTypeSampleUnparseable(args: {
  catalogListingId: string;
  body: z.infer<typeof UnparseableSampleBodySchema>;
}): Promise<Response> {
  if (!(await _isTokenValid({ ...args, token: args.body.token }))) {
    return _respondWithInvalidToken();
  }
  await markListingInvalid({
    catalogListingId: args.catalogListingId,
    reason: "unparseable_dataset",
  });
  return _jsonResponse(200, { invalidDatasetReason: "unparseable_dataset" });
}
