import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { AcquiredGoogleSheetTabCsv } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveClient.types";
import type { GoogleDriveErrorCode } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";

/**
 * Injectable in place of the real `fetch`, for tests: the minimal call
 * signature this module uses rather than `typeof fetch`.
 */
export type GoogleSheetDatasetFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

/** One saved Sheets dataset to read, and the transport to read it with. */
type DatasetReadOptions = {
  datasetId: Dataset.Id;
  datasetFetch?: GoogleSheetDatasetFetch;
};

/**
 * Every code the edge function may answer with. A `Record` rather than a
 * list, so a new `GoogleDriveErrorCode` fails to compile until it is added.
 */
const KNOWN_ERROR_CODES: Record<GoogleDriveErrorCode, true> = {
  "drive-api-not-configured": true,
  "export-too-large": true,
  "file-not-accessible": true,
  "sheet-not-found": true,
  "google-auth-expired": true,
  "owner-reconnect-required": true,
  "rate-limited": true,
  unknown: true,
};

function _isGoogleDriveErrorCode(
  value: unknown,
): value is GoogleDriveErrorCode {
  return typeof value === "string" && Object.hasOwn(KNOWN_ERROR_CODES, value);
}

/**
 * The error a failed route answered with: a `GoogleDriveError` when the edge
 * function classified a Google failure, so the existing copy applies, or a
 * plain `Error` for anything else, such as a 403 for a dataset the caller
 * cannot see.
 */
async function _getErrorFromResponse(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => {
    return undefined;
  })) as { error?: unknown } | undefined;
  const routeError = body?.error;
  if (
    typeof routeError === "object" &&
    routeError !== null &&
    "code" in routeError &&
    _isGoogleDriveErrorCode(routeError.code)
  ) {
    const reason = "reason" in routeError ? routeError.reason : undefined;
    return new GoogleDriveError({
      code: routeError.code,
      status: response.status,
      reason: typeof reason === "string" ? reason : undefined,
    });
  }
  const detail =
    typeof routeError === "string" ? routeError : `HTTP ${response.status}`;
  return new Error(`Reading a Google Sheets dataset failed: ${detail}`);
}

/**
 * Calls one of the `google-sheets` edge function's dataset routes with the
 * caller's session. Fetched directly rather than through `APIClient`, whose
 * parsing would turn the CSV body into a JSON-decoded string and hide the
 * version header.
 */
async function _fetchDatasetRoute(
  options: Readonly<DatasetReadOptions & { route: "csv" | "version" }>,
): Promise<Response> {
  const { data } = await AvaSupabase.db().auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken === undefined) {
    throw new Error("No session is available to read a Google Sheet");
  }
  const url =
    `${AvaSupabase.getEdgeFunctionsURL()}/google-sheets/datasets/` +
    `${encodeURIComponent(options.datasetId)}/${options.route}`;
  const response = await (options.datasetFetch ?? fetch)(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await _getErrorFromResponse(response);
  }
  return response;
}

async function _fetchCsv(
  options: Readonly<DatasetReadOptions>,
): Promise<AcquiredGoogleSheetTabCsv> {
  const response = await _fetchDatasetRoute({ ...options, route: "csv" });
  const sourceVersion = response.headers.get("X-Ava-Source-Version");
  if (sourceVersion === null) {
    throw new Error("The Google Sheets response omitted its source version");
  }
  return { csvText: await response.text(), sourceVersion };
}

async function _fetchVersion(
  options: Readonly<DatasetReadOptions>,
): Promise<SourceVersion> {
  const response = await _fetchDatasetRoute({ ...options, route: "version" });
  const body = (await response.json()) as { sourceVersion?: unknown };
  if (typeof body.sourceVersion !== "string") {
    throw new Error("The Google Sheets response omitted its source version");
  }
  return body.sourceVersion;
}

/**
 * Reads saved Google Sheets datasets through the `google-sheets` edge
 * function, which reads them with the Google grant of the account that added
 * each one. No Google token is ever held in this browser, so anyone who may
 * see a dataset can read it, not only the person who added it.
 */
export const GoogleSheetDatasetProxy = {
  /**
   * The dataset's stored tab as CSV, with the Drive version it was read at.
   * Throws a `GoogleDriveError` for a classified Google failure.
   */
  fetchCsv: _fetchCsv,

  /** The dataset's current Drive `File.version`, without reading any rows. */
  fetchVersion: _fetchVersion,
};
