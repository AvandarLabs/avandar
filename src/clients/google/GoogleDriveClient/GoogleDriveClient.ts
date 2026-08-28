import { getGoogleDriveErrorFromResponse } from "@/clients/google/GoogleDriveClient/getGoogleDriveErrorFromResponse";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type {
  AcquiredGoogleSheet,
  AcquiredGoogleSheetTabCsv,
  GoogleDriveFetch,
  GoogleSheetTab,
} from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

/** The Sheets API, which is where a workbook's tab list comes from. */
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * The per-tab CSV export, which the Drive API has no equivalent of.
 *
 * `files.export` to `text/csv` renders only the workbook's first tab, so
 * addressing a tab by its `gid` means going to this endpoint, the one behind
 * File > Download > CSV in the Sheets UI. It takes the same OAuth bearer token
 * as the API calls above, on the same `drive.file` grant the Picker hands out.
 */
const SHEETS_TAB_EXPORT_URL = "https://docs.google.com/spreadsheets/d";

/**
 * Declares that this client understands shared drives, and must be sent on
 * every request.
 *
 * Drive v3 defaults it to `false`, and a request that omits it cannot see a
 * shared drive item **at all**: `files.get` on a file whose `driveId` is set
 * answers 404 `notFound`, exactly as it would for a file that never existed.
 * Since a picked file 404s only when its per-file grant is missing, that
 * indistinguishable 404 reads as a revoked grant, and the user is told to pick
 * a sheet they just picked.
 *
 * Sent on the export too, even though `files.export` happens to tolerate its
 * absence today. Nothing documents that exemption, and the two calls address
 * the same file, so relying on one of them accepting narrower parameters than
 * the other only sets up the next 404.
 */
const SUPPORTS_ALL_DRIVES_PARAM = "supportsAllDrives=true";

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
    url:
      `${DRIVE_FILES_URL}/${encodeURIComponent(params.fileId)}` +
      `?fields=version&${SUPPORTS_ALL_DRIVES_PARAM}`,
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
      `?mimeType=${encodeURIComponent(XLSX_MIME_TYPE)}` +
      `&${SUPPORTS_ALL_DRIVES_PARAM}`,
    accessToken: params.accessToken,
    driveFetch,
  });

  return {
    xlsxBytes: new Uint8Array(await response.arrayBuffer()),
    sourceVersion,
  };
}

/**
 * Lists a spreadsheet's tabs without reading a single cell.
 *
 * The `fields` mask asks for tab properties only, so this is cheap enough to
 * run the moment a file is picked, which is what lets the user choose a tab
 * before anything is downloaded. One Avandar dataset is one tab, so this is the
 * list that choice is made from.
 *
 * Uses the Sheets API rather than Drive because Drive has no concept of a tab.
 * The `drive.file` scope the Picker grants covers it: that grant is per file
 * and applies across Google APIs, not just Drive.
 *
 * @param params The file to list, the token to list it with, and the transport.
 * @returns Every tab, in workbook order.
 */
export async function getGoogleSheetTabs(
  params: Readonly<{
    fileId: string;
    accessToken: string;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<GoogleSheetTab[]> {
  const response = await _getDriveResponse({
    url:
      `${SHEETS_API_URL}/${encodeURIComponent(params.fileId)}` +
      "?fields=sheets.properties(sheetId,title,index)",
    accessToken: params.accessToken,
    driveFetch: params.driveFetch ?? _fetchFromGoogle,
  });

  const body = (await response.json()) as {
    sheets?: ReadonlyArray<{ properties?: Partial<GoogleSheetTab> }>;
  };
  const tabs = (body.sheets ?? []).flatMap((sheet) => {
    const { sheetId, title, index } = sheet.properties ?? {};
    return typeof sheetId === "number" && typeof title === "string"
      ? [{ sheetId, title, index: index ?? 0 }]
      : [];
  });

  if (tabs.length === 0) {
    throw new GoogleDriveError({
      code: "unknown",
      status: response.status,
      reason: "missing-sheet-properties",
    });
  }

  return tabs;
}

/**
 * Exports one tab of a Google Sheet as CSV, with the version it was exported
 * at.
 *
 * One tab rather than the whole workbook, because one Avandar dataset is one
 * tab. CSV rather than `.xlsx` because DuckDB's CSV reader types its columns
 * from the data, where `read_xlsx` has to be told to read everything as text to
 * avoid aborting on a column whose type changes partway down.
 *
 * The version is read first, for the reason
 * {@link getGoogleSheetXlsxExport} gives.
 *
 * @param params The file and tab to export, the token, and the transport.
 * @returns The tab as CSV text and the source version it belongs to.
 */
export async function getGoogleSheetTabCsvExport(
  params: Readonly<{
    fileId: string;
    sheetId: number;
    accessToken: string;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<AcquiredGoogleSheetTabCsv> {
  const driveFetch = params.driveFetch ?? _fetchFromGoogle;

  const sourceVersion = await getGoogleSheetVersion({
    fileId: params.fileId,
    accessToken: params.accessToken,
    driveFetch,
  });

  const response = await _getDriveResponse({
    url:
      `${SHEETS_TAB_EXPORT_URL}/${encodeURIComponent(params.fileId)}/export` +
      `?format=csv&gid=${encodeURIComponent(String(params.sheetId))}`,
    accessToken: params.accessToken,
    driveFetch,
  });

  return { csvText: await response.text(), sourceVersion };
}

/**
 * Downloads the tab a stored dataset points at, resolving it by name.
 *
 * The one place that knows what a stored tab name of `null` means: the
 * workbook's first tab, which is what rows written before the tab column
 * carried. Import, refresh and query-time acquisition all come through here,
 * so a dataset's rows are read the same way whoever asked for them.
 *
 * Resolution is by title because that is what
 * `datasets__google_sheets.sheet_name` stores, and a title is the one property
 * of a tab a user can rename. A renamed tab therefore fails here, loudly and by
 * name, rather than quietly returning some other tab's rows. Recording each
 * tab's `gid` at import would make a rename stop mattering.
 *
 * @param params The file and stored tab name, the token, and the transport.
 * @returns The tab as CSV text, the tab it resolved to, and the source version.
 */
export async function getStoredGoogleSheetTabCsv(
  params: Readonly<{
    fileId: string;
    sheetName: string | null;
    accessToken: string;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<AcquiredGoogleSheetTabCsv & { tab: GoogleSheetTab }> {
  const tabs = await getGoogleSheetTabs({
    fileId: params.fileId,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch,
  });

  const tab =
    params.sheetName === null
      ? tabs[0]
      : tabs.find((candidate) => {
          return candidate.title === params.sheetName;
        });

  if (!tab) {
    throw new GoogleDriveError({
      code: "sheet-not-found",
      status: 404,
      reason: params.sheetName ?? "first-tab",
    });
  }

  const acquired = await getGoogleSheetTabCsvExport({
    fileId: params.fileId,
    sheetId: tab.sheetId,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch,
  });

  return { ...acquired, tab };
}
