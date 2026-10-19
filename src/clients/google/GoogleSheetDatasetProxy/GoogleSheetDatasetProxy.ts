import { isPlainObject } from "@avandar/utils";
import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError";
import { fetchEdgeFunctionRoute } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";
import type { AcquiredGoogleSheetTabCsv } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveClient.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";

/** One saved Sheets dataset to read, and the transport to read it with. */
type DatasetReadOptions = {
  datasetId: Dataset.Id;
  datasetFetch?: EdgeFunctionFetch;
};

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
  if (isPlainObject(routeError) && GoogleDriveError.isCode(routeError.code)) {
    return new GoogleDriveError({
      code: routeError.code,
      status: response.status,
      reason:
        typeof routeError.reason === "string" ? routeError.reason : undefined,
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
  const response = await fetchEdgeFunctionRoute({
    path: `google-sheets/datasets/${encodeURIComponent(options.datasetId)}/${options.route}`,
    fetch: options.datasetFetch,
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
