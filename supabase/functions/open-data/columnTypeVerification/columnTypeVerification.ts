import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { SupabaseAdmin } from "@sbfn/_shared/supabase.ts";
import {
  buildCompleteSampleSha256,
  isColumnTypeSampleTokenValid,
  isCompleteSampleVouchedFor,
  signColumnTypeSampleToken,
} from "@sbfn/open-data/columnTypeSampleToken/columnTypeSampleToken.ts";
import { gzipBytes } from "@sbfn/open-data/gzipBytes/gzipBytes.ts";
import { createByteRangeReader } from "@sbfn/open-data/readByteRangeOverHttp/readByteRangeOverHttp.ts";
import { z } from "zod";
import { acquireOpenDataColumnTypeSample } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import { Constants } from "$/types/database.types.ts";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { MarkListingInvalid } from "@sbfn/open-data/respondWithSampleFailure/respondWithSampleFailure.ts";

/** The largest response a sample's metadata or Socrata rows may be. */
const MAX_SAMPLE_RESPONSE_BYTES = 25 * 1024 * 1024;

/** The header the sample route returns its token in. */
export const COLUMN_TYPE_TOKEN_HEADER = "X-Ava-Column-Type-Token";

/**
 * The header the sample route sets to `true` when the sample holds the
 * whole source.
 */
export const COLUMN_TYPE_SAMPLE_COMPLETE_HEADER =
  "X-Ava-Column-Type-Sample-Complete";

/**
 * The largest complete sample a copy request may hand back, in characters:
 * the most a Socrata sample read may hold.
 */
const MAX_COMPLETE_SAMPLE_CHARACTERS = MAX_SAMPLE_RESPONSE_BYTES;

/**
 * A complete column type sample handed back with a copy request, with the
 * token it was served with, so the copy is built from it instead of the
 * source.
 */
export const CompleteSampleBodySchema = z.object({
  token: z.string().min(1).max(4096),
  csvText: z.string().min(1).max(MAX_COMPLETE_SAMPLE_CHARACTERS),
});

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
 * A sample that holds the whole source says so in
 * `X-Ava-Column-Type-Sample-Complete`, and its token carries the hash of its
 * text as a browser reads it, so the browser can hand it back to be copied
 * (`readVouchedCompleteSample`).
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
  // Hashed as the text a browser's `response.text()` reads, which decodes
  // the bytes the same way.
  const completeSampleSha256 = sample.isComplete
    ? await buildCompleteSampleSha256(new TextDecoder().decode(sample.bytes))
    : undefined;
  const token = await signColumnTypeSampleToken({
    catalogListingId: entry.id,
    secret: _getSigningSecret(),
    now: Date.now(),
    completeSampleSha256,
  });
  return new Response(await gzipBytes(sample.bytes), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Access-Control-Expose-Headers": `${COLUMN_TYPE_TOKEN_HEADER}, ${COLUMN_TYPE_SAMPLE_COMPLETE_HEADER}`,
      "Content-Encoding": "gzip",
      "Content-Type": "text/csv",
      [COLUMN_TYPE_TOKEN_HEADER]: token,
      [COLUMN_TYPE_SAMPLE_COMPLETE_HEADER]: String(sample.isComplete),
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

/**
 * The text of a complete sample handed back with a copy request, when its
 * token vouches for exactly that text as the whole source of this listing.
 * Anything else, a changed text, an expired token, or a sample that was not
 * complete, is ignored, and the copy is built from the source as usual.
 *
 * @returns The sample's text, or nothing when it is not vouched for.
 */
export async function readVouchedCompleteSample(args: {
  catalogListingId: string;
  completeSample: z.infer<typeof CompleteSampleBodySchema> | undefined;
}): Promise<string | undefined> {
  if (args.completeSample === undefined) {
    return undefined;
  }
  const isVouchedFor = await isCompleteSampleVouchedFor({
    token: args.completeSample.token,
    csvText: args.completeSample.csvText,
    catalogListingId: args.catalogListingId,
    secret: _getSigningSecret(),
    now: Date.now(),
  });
  return isVouchedFor ? args.completeSample.csvText : undefined;
}
