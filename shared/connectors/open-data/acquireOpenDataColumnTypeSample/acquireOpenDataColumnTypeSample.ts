import { match } from "ts-pattern";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient.ts";
import { formatToContentKind } from "$/connectors/open-data/formatToContentKind.ts";
import { getCkanResourceFromPackage } from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";
import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type {
  CkanPackage,
  OpenDataHttp,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataApiAccessFor } from "$/connectors/open-data/OpenDataApiAccess.types.ts";

/** Rows of a Socrata dataset a sample holds. */
export const COLUMN_TYPE_SAMPLE_MAX_ROWS = 10_000;

/** Bytes of a CKAN file a sample holds. */
export const COLUMN_TYPE_SAMPLE_MAX_BYTES = 5 * 1024 * 1024;

/** HTTP statuses saying the dataset or file no longer exists. */
const _GONE_STATUSES: ReadonlySet<number> = new Set([404, 410]);

/** HTTP statuses saying the source wants credentials. */
const _AUTHORIZATION_STATUSES: ReadonlySet<number> = new Set([401, 403]);

/**
 * What a range request for the start of an empty file answers: there is no
 * first byte to send.
 */
const _RANGE_NOT_SATISFIABLE_STATUS = 416;

const _NEWLINE_BYTE = 0x0a;

const _QUOTE_CHARACTER = '"';

/** Tab, line feed, carriage return, and space. */
const _WHITESPACE_BYTES: ReadonlySet<number> = new Set([
  0x09, 0x0a, 0x0d, 0x20,
]);

/**
 * Reads at most `maxBytes` from the start of a file. A server that ignores a
 * range request still yields only the first `maxBytes`. A response that is
 * not a success throws an `HttpClientError` carrying its status.
 */
export type ReadByteRange = (args: {
  url: string;
  maxBytes: number;
}) => Promise<Uint8Array>;

/**
 * The start of a source's real data, as raw bytes. Nothing here parses it:
 * the app's DuckDB reads it as CSV, delimiter, quoting, and header
 * included.
 *
 * `isComplete` is true when the sample holds the whole source: a Socrata
 * export with fewer rows than the row limit, or a CKAN file that ended
 * before the byte limit. A complete sample can be copied as the source
 * itself, without reading the source again.
 */
export type OpenDataColumnTypeSample = Readonly<{
  bytes: Uint8Array;
  isComplete: boolean;
}>;

function _readHttpStatus(error: unknown): number | undefined {
  return error instanceof HttpClientError ? error.status : undefined;
}

/**
 * Cuts a sample that filled the byte limit back to its last line break, so
 * the reader that infers types never sees a partial row. A line feed byte
 * never occurs inside a multi-byte UTF-8 character, so the cut needs no
 * decoding.
 */
function _trimToLastCompleteLine(args: {
  bytes: Uint8Array;
  maxBytes: number;
}): Uint8Array {
  if (args.bytes.byteLength < args.maxBytes) {
    return args.bytes;
  }
  const lastLineBreak = args.bytes.lastIndexOf(_NEWLINE_BYTE);
  return lastLineBreak === -1
    ? args.bytes
    : args.bytes.subarray(0, lastLineBreak + 1);
}

/**
 * Counts a CSV's records, header included. A line break inside a double
 * quoted value does not end a record. Only line breaks and quotes are read,
 * so the count needs no knowledge of the delimiter.
 */
function _countCsvRecords(csvText: string): number {
  let numRecords = 0;
  let isInQuotes = false;
  let hasOpenRecord = false;
  for (const character of csvText) {
    if (character === _QUOTE_CHARACTER) {
      isInQuotes = !isInQuotes;
    }
    if (character === "\n" && !isInQuotes) {
      numRecords += 1;
      hasOpenRecord = false;
    } else if (character !== "\r") {
      hasOpenRecord = true;
    }
  }
  return hasOpenRecord ? numRecords + 1 : numRecords;
}

function _isBlank(bytes: Uint8Array): boolean {
  return bytes.every((byte) => {
    return _WHITESPACE_BYTES.has(byte);
  });
}

/**
 * Reads the dataset from the CKAN API. A 404 means the dataset is gone and
 * a 401 or 403 that it is private. Any other failure, a server error or no
 * answer at all, is the API's own trouble, so it says nothing about the
 * resource and is reported as `ckan-unreachable`.
 */
async function _getCkanPackage(args: {
  access: Readonly<OpenDataApiAccessFor<"ckan">>;
  http: Readonly<OpenDataHttp>;
}): Promise<CkanPackage> {
  const { access } = args;
  try {
    return await createCkanClient(args.http).getPackage({
      baseUrl: access.apiBaseUrl,
      ckanDatasetId: access.externalDatasetId,
    });
  } catch (cause) {
    if (OpenDataAcquisitionFailed.is(cause)) {
      throw cause;
    }
    const status = _readHttpStatus(cause);
    if (status !== undefined && _GONE_STATUSES.has(status)) {
      throw new OpenDataAcquisitionFailed(
        { code: "resource-not-found", ckanResourceId: access.apiResourceId },
        cause,
      );
    }
    if (status !== undefined && _AUTHORIZATION_STATUSES.has(status)) {
      throw new OpenDataAcquisitionFailed(
        { code: "ckan-authorization-required", action: "package_show" },
        cause,
      );
    }
    throw new OpenDataAcquisitionFailed(
      { code: "ckan-unreachable", action: "package_show" },
      cause,
    );
  }
}

/** Why reading a CKAN file failed, from what its host answered. */
function _createFileReadFailure(
  error: unknown,
  ckanResourceId: string,
): OpenDataAcquisitionFailed {
  const status = _readHttpStatus(error) ?? 0;
  if (status === _RANGE_NOT_SATISFIABLE_STATUS) {
    return new OpenDataAcquisitionFailed(
      { code: "resource-empty", ckanResourceId },
      error,
    );
  }
  if (_GONE_STATUSES.has(status)) {
    return new OpenDataAcquisitionFailed(
      { code: "resource-not-found", ckanResourceId },
      error,
    );
  }
  const code = _AUTHORIZATION_STATUSES.has(status)
    ? "resource-authorization-required"
    : "resource-unreachable";
  return new OpenDataAcquisitionFailed({ code, ckanResourceId }, error);
}

/**
 * Reads the start of a CKAN file, refusing one with no content. A file that
 * ended before the byte limit was read whole.
 */
async function _readCkanFileStart(args: {
  url: string;
  ckanResourceId: string;
  readByteRange: ReadByteRange;
}): Promise<OpenDataColumnTypeSample> {
  let bytes: Uint8Array;
  try {
    bytes = await args.readByteRange({
      url: args.url,
      maxBytes: COLUMN_TYPE_SAMPLE_MAX_BYTES,
    });
  } catch (error) {
    throw _createFileReadFailure(error, args.ckanResourceId);
  }
  if (_isBlank(bytes)) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-empty",
      ckanResourceId: args.ckanResourceId,
    });
  }
  return {
    bytes: _trimToLastCompleteLine({
      bytes,
      maxBytes: COLUMN_TYPE_SAMPLE_MAX_BYTES,
    }),
    isComplete: bytes.byteLength < COLUMN_TYPE_SAMPLE_MAX_BYTES,
  };
}

async function _sampleCkanResource(args: {
  access: Readonly<OpenDataApiAccessFor<"ckan">>;
  http: Readonly<OpenDataHttp>;
  readByteRange: ReadByteRange;
}): Promise<OpenDataColumnTypeSample> {
  const { access } = args;
  const ckanPackage = await _getCkanPackage(args);
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
  return await _readCkanFileStart({
    url: resource.url,
    ckanResourceId: resource.id,
    readByteRange: args.readByteRange,
  });
}

/**
 * Reads a sample of an API-backed catalog listing's real data, to infer its
 * column types from: the first `COLUMN_TYPE_SAMPLE_MAX_ROWS` rows of a
 * Socrata dataset's CSV export, or the first `COLUMN_TYPE_SAMPLE_MAX_BYTES`
 * of a CKAN CSV file, cut back to a complete line. A CKAN resource is found
 * and host-checked by `getCkanResourceFromPackage`.
 *
 * @param params.entry - The listing.
 * @param params.http - Reads CKAN metadata and Socrata exports.
 * @param params.readByteRange - Reads the start of a CKAN file.
 * @returns The sample's raw bytes, and whether they are the whole source.
 * @throws `OpenDataAcquisitionFailed` when the listing is not API-backed, or
 *   names a CKAN resource that is not a CSV or cannot be read. Its code says
 *   whether the CKAN API failed (`ckan-unreachable`) or the resource did
 *   (`resource-empty`, `resource-unreachable`, and the rest).
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
  return await match(access)
    .with({ apiService: "ckan" }, (ckanAccess) => {
      return _sampleCkanResource({ ...params, access: ckanAccess });
    })
    .with({ apiService: "socrata" }, async (socrataAccess) => {
      const csvText = await createSocrataClient(params.http).getRows({
        baseUrl: socrataAccess.apiBaseUrl,
        socrataDatasetId: socrataAccess.externalDatasetId,
        maxRows: COLUMN_TYPE_SAMPLE_MAX_ROWS,
      });
      const numRows = _countCsvRecords(csvText) - 1;
      return {
        bytes: new TextEncoder().encode(csvText),
        isComplete: numRows < COLUMN_TYPE_SAMPLE_MAX_ROWS,
      };
    })
    .exhaustive();
}
