import { match } from "ts-pattern";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { formatToContentKind } from "$/connectors/open-data/formatToContentKind.ts";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { parseCsvHeaderLine } from "$/connectors/open-data/parseCsvHeaderLine/parseCsvHeaderLine.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/acquireOpenDataResource.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/** Rows of a Socrata dataset a sample holds. */
export const COLUMN_TYPE_SAMPLE_MAX_ROWS = 10_000;

/** Bytes of a CKAN file a sample holds. */
export const COLUMN_TYPE_SAMPLE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Reads at most `maxBytes` from the start of a file. A server that ignores a
 * range request still yields only the first `maxBytes`.
 */
export type ReadByteRange = (args: {
  url: string;
  maxBytes: number;
}) => Promise<Uint8Array>;

/** The start of a source's real data, as CSV, and the names in its header. */
export type OpenDataColumnTypeSample = Readonly<{
  csvText: string;
  headerNames: readonly string[];
}>;

/**
 * Cuts a sample that may end mid-row back to its last complete line, so the
 * reader that infers types never sees a partial row.
 */
function _trimToLastCompleteLine(args: {
  bytes: Uint8Array;
  maxBytes: number;
}): string {
  const text = new TextDecoder().decode(args.bytes);
  if (args.bytes.byteLength < args.maxBytes) {
    return text;
  }
  const lastLineBreak = text.lastIndexOf("\n");
  return lastLineBreak === -1 ? text : text.slice(0, lastLineBreak + 1);
}

async function _sampleCkanResource(args: {
  access: Readonly<OpenDataApiAccessFor<"ckan">>;
  http: Readonly<OpenDataHttp>;
  readByteRange: ReadByteRange;
}): Promise<string> {
  const { access } = args;
  const ckanPackage = await createCkanClient(args.http).getPackage({
    baseUrl: access.apiBaseUrl,
    ckanDatasetId: access.externalDatasetId,
  });
  // Only the start of the file is read, so the file's size sets no limit.
  const resource = getCkanResourceFromPackage({
    ckanPackage,
    ckanResourceId: access.apiResourceId,
    baseUrl: access.apiBaseUrl,
    expectedFormat: access.expectedFormat,
    maxBytes: Number.MAX_SAFE_INTEGER,
  });
  if (formatToContentKind(resource.format) !== "csv") {
    throw new OpenDataAcquisitionFailed({
      code: "resource-format-unsupported",
      ckanResourceId: resource.id,
      format: resource.format,
    });
  }
  const bytes = await args.readByteRange({
    url: resource.url,
    maxBytes: COLUMN_TYPE_SAMPLE_MAX_BYTES,
  });
  return _trimToLastCompleteLine({
    bytes,
    maxBytes: COLUMN_TYPE_SAMPLE_MAX_BYTES,
  });
}

/**
 * Reads a sample of an API-backed catalog listing's real data, to infer its
 * column types from: the first `COLUMN_TYPE_SAMPLE_MAX_ROWS` rows of a
 * Socrata dataset's CSV export, or the first `COLUMN_TYPE_SAMPLE_MAX_BYTES`
 * of a CKAN CSV file, cut back to a complete line. A CKAN resource is found
 * and host-checked the same way `acquireOpenDataResource` does.
 *
 * @param params.entry - The listing.
 * @param params.http - Reads CKAN metadata and Socrata exports.
 * @param params.readByteRange - Reads the start of a CKAN file.
 * @returns The sample and its header's names.
 * @throws `OpenDataAcquisitionFailed` when the listing is not API-backed, or
 *   names a CKAN resource that is not a CSV or cannot be read.
 */
export async function acquireOpenDataColumnTypeSample(params: {
  entry: Readonly<DataCatalogListing.T>;
  http: Readonly<OpenDataHttp>;
  readByteRange: ReadByteRange;
}): Promise<OpenDataColumnTypeSample> {
  const access = DataCatalogListing.toAccess(params.entry);
  if (access?.kind !== "api_resource") {
    throw new OpenDataAcquisitionFailed({
      code: "access-shape-invalid",
      accessKind: params.entry.accessKind,
    });
  }
  const csvText = await match(access)
    .with({ apiService: "ckan" }, (ckanAccess) => {
      return _sampleCkanResource({ ...params, access: ckanAccess });
    })
    .with({ apiService: "socrata" }, (socrataAccess) => {
      return createSocrataClient(params.http).getRows({
        baseUrl: socrataAccess.apiBaseUrl,
        socrataDatasetId: socrataAccess.externalDatasetId,
        maxRows: COLUMN_TYPE_SAMPLE_MAX_ROWS,
      });
    })
    .exhaustive();
  return { csvText, headerNames: parseCsvHeaderLine(csvText) };
}
