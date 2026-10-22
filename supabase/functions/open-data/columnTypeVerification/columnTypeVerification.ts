import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import {
  isColumnTypeSampleTokenValid,
  signColumnTypeSampleToken,
} from "@sbfn/open-data/columnTypeSampleToken/columnTypeSampleToken.ts";
import { createByteRangeReader } from "@sbfn/open-data/readByteRangeOverHttp/readByteRangeOverHttp.ts";
import { z } from "zod";
import { acquireOpenDataColumnTypeSample } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import { Constants } from "$/types/database.types.ts";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
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

/**
 * Answers with a sample of a listing's real data as CSV text, and a token in
 * `X-Ava-Column-Type-Token` that vouches for the sample's header. The
 * browser infers the column types from the sample and sends them back with
 * the token to `writeVerifiedColumnTypes`.
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
    headerNames: sample.headerNames,
    secret: _getSigningSecret(),
    now: Date.now(),
  });
  return new Response(sample.csvText, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Access-Control-Expose-Headers": COLUMN_TYPE_TOKEN_HEADER,
      "Content-Type": "text/csv; charset=utf-8",
      [COLUMN_TYPE_TOKEN_HEADER]: token,
    },
  });
}

/**
 * Writes column types the browser inferred from a sample this function
 * served. The column names must be exactly the sample's header, in order,
 * as its token vouches, so a caller can label types but cannot add, drop,
 * or rename columns. Answers 409 with `column-type-sample-mismatch` when
 * they are not.
 *
 * Trusting the browser's types at all is temporary: once DuckDB can run
 * server-side, the server should read the sample and infer the types
 * itself.
 */
export async function writeVerifiedColumnTypes(args: {
  catalogListingId: string;
  body: z.infer<typeof VerifiedColumnTypesBodySchema>;
}): Promise<Response> {
  const isTokenValid = await isColumnTypeSampleTokenValid({
    token: args.body.token,
    catalogListingId: args.catalogListingId,
    headerNames: args.body.columns.map((column) => {
      return column.name;
    }),
    secret: _getSigningSecret(),
    now: Date.now(),
  });
  if (!isTokenValid) {
    return _jsonResponse(409, {
      error: { code: "column-type-sample-mismatch" },
    });
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
