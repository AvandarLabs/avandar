import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { Constants } from "$/types/database.types";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Enums } from "$/types/database.types";

/** One column's name and the type inferred from the sample. */
export type InferredColumnType = Readonly<{
  name: string;
  dataType: Enums<"datasets__duckdb_data_type">;
}>;

/** Infers each column's type from CSV text, in the text's column order. */
type InferColumnTypes = (
  csvText: string,
) => Promise<readonly InferredColumnType[]>;

const DUCKDB_DATA_TYPES: ReadonlySet<string> = new Set(
  Constants.public.Enums.datasets__duckdb_data_type,
);

function _toKnownDataType(
  dataType: string,
): Enums<"datasets__duckdb_data_type"> {
  return DUCKDB_DATA_TYPES.has(dataType)
    ? (dataType as Enums<"datasets__duckdb_data_type">)
    : "VARCHAR";
}

/** Infers column types with the browser's DuckDB CSV sniffer. */
async function _inferColumnTypesWithDuckDb(
  csvText: string,
): Promise<readonly InferredColumnType[]> {
  const sniffed = await DuckDbClient.sniffCsv({
    file: new File([csvText], "column-type-sample.csv", { type: "text/csv" }),
    maxPreviewRows: 1,
    hasHeader: true,
  });
  return sniffed.columns.map((column) => {
    return {
      name: column.column_name,
      dataType: _toKnownDataType(column.column_type),
    };
  });
}

/**
 * Whether a catalog listing's column types should be verified: it is an
 * API-backed CSV resource whose types were never verified, or were verified
 * before its source last changed. A Parquet resource's types come from its
 * file when a pipeline reads it.
 */
export function isColumnTypeVerificationDue(
  listing: Pick<
    DataCatalogListing.T,
    | "accessKind"
    | "apiResourceFormat"
    | "dateColumnTypeLastVerified"
    | "dateOfLastUpdate"
  >,
): boolean {
  if (
    listing.accessKind !== "api_resource" ||
    listing.apiResourceFormat?.toUpperCase() !== "CSV"
  ) {
    return false;
  }
  if (listing.dateColumnTypeLastVerified === undefined) {
    return true;
  }
  return (
    listing.dateOfLastUpdate !== undefined &&
    Date.parse(listing.dateColumnTypeLastVerified) <
      Date.parse(listing.dateOfLastUpdate)
  );
}

async function _readAccessToken(): Promise<string> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to verify column types");
  }
  return accessToken;
}

/**
 * Verifies one catalog listing's column types: reads a sample of its source
 * through the open-data edge function, infers each column's type with
 * DuckDB in this browser, and sends the types back to be written. The edge
 * function only accepts them for exactly the sample's columns.
 *
 * Inferring in the browser is temporary: once DuckDB can run server-side,
 * the server should read the sample and infer the types itself.
 *
 * @param catalogListingId - The listing.
 * @param options.inferColumnTypes - Replaces the DuckDB inference, for tests.
 * @throws When the sample cannot be read or the types are refused.
 */
export async function verifyOpenDataColumnTypes(
  catalogListingId: DataCatalogListing.Id,
  options: { inferColumnTypes?: InferColumnTypes } = {},
): Promise<void> {
  const inferColumnTypes =
    options.inferColumnTypes ?? _inferColumnTypesWithDuckDb;
  const accessToken = await _readAccessToken();
  const listingUrl =
    `${AvaSupabase.getEdgeFunctionsURL()}/open-data/data-catalog-listings/` +
    encodeURIComponent(catalogListingId);
  const sampleResponse = await fetch(`${listingUrl}/column-type-sample`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!sampleResponse.ok) {
    throw new Error(
      `Column type sample fetch failed: ${sampleResponse.status}`,
    );
  }
  const token = sampleResponse.headers.get("X-Ava-Column-Type-Token") ?? "";
  const columns = await inferColumnTypes(await sampleResponse.text());
  const writeResponse = await fetch(`${listingUrl}/column-types`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, columns }),
  });
  if (!writeResponse.ok) {
    throw new Error(`Column type write-back failed: ${writeResponse.status}`);
  }
}
