import { Constants } from "$/types/database.types";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import {
  buildOpenDataListingUrl,
  fetchOpenDataColumnTypeSample,
  readOpenDataAccessToken,
} from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
import { requestOpenDataParquetCopy } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";
import { Logger } from "@/utils/Logger";
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
 * file when a pipeline reads it. A listing marked invalid is not tried
 * again: a pipeline rewrite after its source changes clears the mark. A
 * listing a workspace cannot load is never sampled.
 */
export function isColumnTypeVerificationDue(
  listing: Pick<
    DataCatalogListing.T,
    | "accessKind"
    | "apiResourceFormat"
    | "dateColumnTypeLastVerified"
    | "dateOfLastUpdate"
    | "isInvalid"
    | "isWorkspaceLoadable"
  >,
): boolean {
  if (
    listing.isInvalid ||
    !listing.isWorkspaceLoadable ||
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

/**
 * Infers a sample's column types. When DuckDB cannot parse the sample, or
 * finds no columns in it, the server is told the listing is unparseable.
 *
 * @throws When the sample could not be parsed.
 */
async function _inferOrReportUnparseable(args: {
  csvText: string;
  token: string;
  listingUrl: string;
  accessToken: string;
  inferColumnTypes: InferColumnTypes;
}): Promise<readonly InferredColumnType[]> {
  let columns: readonly InferredColumnType[] = [];
  let cause: unknown;
  try {
    columns = await args.inferColumnTypes(args.csvText);
  } catch (error) {
    cause = error;
  }
  if (columns.length > 0) {
    return columns;
  }
  await fetch(`${args.listingUrl}/unparseable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: args.token }),
  });
  throw new Error("The column type sample could not be parsed", { cause });
}

/**
 * Verifies one catalog listing's column types: reads a sample of its source
 * through the open-data edge function, infers each column's name and type
 * with DuckDB in this browser, and sends them back to be written. The edge
 * function never parses the sample, so DuckDB's CSV detection decides the
 * delimiter, quoting, and header. A sample DuckDB cannot read marks the
 * listing unparseable, and a sample the server cannot read at all may mark
 * it invalid on the server's side.
 *
 * A sample that held the whole source is then handed back to build the
 * listing's Parquet copy from, so the copy is under way without the source
 * being read again. A copy that cannot be requested is logged, and leaves
 * the verification itself standing.
 *
 * Inferring in the browser is temporary: once DuckDB can run server-side,
 * the server should read the sample and infer the types itself.
 *
 * @param catalogListingId - The listing.
 * @param options.inferColumnTypes - Replaces the DuckDB inference, for tests.
 * @throws When the sample cannot be read or parsed, or the types are
 *   refused.
 */
export async function verifyOpenDataColumnTypes(
  catalogListingId: DataCatalogListing.Id,
  options: { inferColumnTypes?: InferColumnTypes } = {},
): Promise<void> {
  const accessToken = await readOpenDataAccessToken();
  const listingUrl = buildOpenDataListingUrl(catalogListingId);
  const { csvText, token, isComplete } = await fetchOpenDataColumnTypeSample(
    catalogListingId,
    { accessToken },
  );
  const columns = await _inferOrReportUnparseable({
    csvText,
    token,
    listingUrl,
    accessToken,
    inferColumnTypes: options.inferColumnTypes ?? _inferColumnTypesWithDuckDb,
  });
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
  if (isComplete) {
    await _requestCopyFromCompleteSample({
      catalogListingId,
      accessToken,
      completeSample: { csvText, token },
    });
  }
}

/**
 * Asks for a listing's copy to be built from a sample that held its whole
 * source. A failure is only logged: adding the listing asks again.
 */
async function _requestCopyFromCompleteSample(args: {
  catalogListingId: DataCatalogListing.Id;
  accessToken: string;
  completeSample: Readonly<{ csvText: string; token: string }>;
}): Promise<void> {
  try {
    await requestOpenDataParquetCopy(args.catalogListingId, {
      accessToken: args.accessToken,
      completeSample: args.completeSample,
    });
  } catch (error) {
    Logger.warn("Could not build a catalog listing's copy from its sample", {
      catalogListingId: args.catalogListingId,
      error,
    });
  }
}
