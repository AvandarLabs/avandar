import { getGoogleDriveErrorFromResponse } from "@/clients/google/GoogleDriveClient/getGoogleDriveErrorFromResponse";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type {
  AcquiredGoogleSheet,
  GoogleDriveFetch,
} from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

/**
 * The MIME type Drive renders a Google Sheet into. This exact string is what
 * makes the export an `.xlsx` workbook that `read_xlsx` can read, so it is not
 * interchangeable with any of Drive's other spreadsheet export types.
 */
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** The default transport: a plain `fetch` with no retry and no interception. */
const _fetchFromGoogle: GoogleDriveFetch = (url, init) => {
  return fetch(url, { headers: { ...init.headers } });
};

/** Sends one authorized Drive request and throws a mapped error on non-2xx. */
async function _getDriveResponse(
  params: Readonly<{
    url: string;
    accessToken: string;
    driveFetch: GoogleDriveFetch;
  }>,
): Promise<Response> {
  const response = await params.driveFetch(params.url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });

  if (!response.ok) {
    throw await getGoogleDriveErrorFromResponse(response);
  }

  return response;
}

/**
 * Reads a spreadsheet's Drive `File.version`.
 *
 * The version is opaque and is only ever compared for equality, so it is
 * returned as the string Drive sent. Coercing it to a number would be lossy:
 * Drive documents the field as an int64, and it is delivered as a string for
 * exactly that reason.
 *
 * Drive documents `version` as reflecting *every* change made to the file on
 * the server, including changes not visible to the user, so it reports
 * "changed" more often than the cell values change. That is the safe direction:
 * a false positive costs one re-export, where a false negative would serve
 * stale rows.
 *
 * @param params The file to read, the token to read it with, and the transport.
 * @returns The `File.version` string, verbatim.
 */
export async function getGoogleSheetVersion(
  params: Readonly<{
    fileId: string;
    accessToken: string;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<SourceVersion> {
  const response = await _getDriveResponse({
    url: `${DRIVE_FILES_URL}/${encodeURIComponent(params.fileId)}?fields=version`,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch ?? _fetchFromGoogle,
  });

  const body = (await response.json()) as { version?: unknown };
  if (typeof body.version !== "string") {
    throw new GoogleDriveError({
      code: "unknown",
      status: response.status,
      reason: "missing-version-field",
    });
  }

  return body.version;
}

/**
 * Exports a Google Sheet as an `.xlsx` workbook, with the version it was
 * exported at.
 *
 * Two Drive calls, and **the version is read first**. An edit landing between
 * the two then pairs fresh bytes with an old version, which costs one extra
 * export on the next freshness check. Reading the version afterwards would pair
 * stale bytes with a new version, which a cache would read as current and
 * serve. One ordering wastes a call in a rare race; the other returns wrong
 * rows.
 *
 * There is deliberately **no tab parameter**. Drive's export is workbook-scoped
 * and returns every tab in one response; which tab becomes a relation is a
 * `read_xlsx` argument the caller supplies to `DuckDbClient.loadXlsx`.
 *
 * Drive caps exported content at 10 MB and refuses beyond it. The cap cannot be
 * checked in advance, because it applies to the workbook Drive renders and
 * `files.get` reports no size for a Google Workspace file, so the refusal
 * surfaces as a `GoogleDriveError` with code `export-too-large`.
 *
 * @param params The file to export, the token to export it with, and the
 * transport.
 * @returns The workbook bytes and the source version they belong to.
 */
export async function getGoogleSheetXlsxExport(
  params: Readonly<{
    fileId: string;
    accessToken: string;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<AcquiredGoogleSheet> {
  const driveFetch = params.driveFetch ?? _fetchFromGoogle;

  const sourceVersion = await getGoogleSheetVersion({
    fileId: params.fileId,
    accessToken: params.accessToken,
    driveFetch,
  });

  const response = await _getDriveResponse({
    url:
      `${DRIVE_FILES_URL}/${encodeURIComponent(params.fileId)}/export` +
      `?mimeType=${encodeURIComponent(XLSX_MIME_TYPE)}`,
    accessToken: params.accessToken,
    driveFetch,
  });

  return {
    xlsxBytes: new Uint8Array(await response.arrayBuffer()),
    sourceVersion,
  };
}
