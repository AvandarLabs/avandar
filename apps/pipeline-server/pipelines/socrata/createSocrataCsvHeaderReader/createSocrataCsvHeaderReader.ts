import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/** The part of `fetch` the reader uses. */
type _Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** How long one header request may take before it counts as failed. */
const HEADER_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Reads the header of a dataset's CSV export.
 *
 * @returns The column names, in the export's order, or `undefined` when the
 *   dataset has no CSV export or the request fails.
 */
export type SocrataCsvHeaderReader = (args: {
  drive: Readonly<ConfiguredDrive>;
  datasetId: string;
}) => Promise<readonly string[] | undefined>;

/**
 * Parses the first record of CSV text, following RFC 4180 quoting: a quoted
 * field may hold commas, line breaks, and doubled quotes.
 *
 * @param text - CSV text, of which only the first record is read.
 * @returns The first record's fields.
 */
export function parseCsvHeaderLine(text: string): string[] {
  const fields: string[] = [];
  let field = "";
  let isQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      isQuoted = true;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      break;
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * Creates the reader the Socrata pipeline names a dataset's columns with. It
 * asks the drive's SODA endpoint for the same `.csv` export
 * `SocrataClient.getRows` downloads, with `$limit=0`, which returns only its
 * header. The Discovery API's column list is not a substitute: it can list
 * columns the export leaves out, such as a legacy Location column's
 * `_address`, `_city`, `_state`, and `_zip` parts.
 *
 * @param params.appToken - A Socrata app token, or `undefined` for none.
 * @param params.fetchImpl - Replaces `fetch`, for tests.
 */
export function createSocrataCsvHeaderReader(params: {
  appToken: string | undefined;
  fetchImpl?: _Fetch;
}): SocrataCsvHeaderReader {
  const fetchImpl: _Fetch = params.fetchImpl ?? fetch;
  const headers: Record<string, string> =
    params.appToken === undefined ? {} : { "X-App-Token": params.appToken };
  return async ({ drive, datasetId }) => {
    const url = `${drive.baseUrl}/resource/${encodeURIComponent(datasetId)}.csv?%24limit=0`;
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(HEADER_REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.warn(
          `[socrata] drive ${drive.baseUrl}: no CSV header for ${datasetId}: HTTP ${response.status}`,
        );
        return undefined;
      }
      const header = parseCsvHeaderLine(await response.text());
      return header.length === 1 && header[0] === "" ? undefined : header;
    } catch (error) {
      console.warn(
        `[socrata] drive ${drive.baseUrl}: no CSV header for ${datasetId}: ${String(error)}`,
      );
      return undefined;
    }
  };
}
