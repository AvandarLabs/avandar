import { assertIsNonEmptyArray, isNonEmptyArray } from "@avandar/utils";
import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { getGoogleAuthClient } from "@sbfn/_shared/getGoogleAuthClient.ts";
import { PAYLOAD_TOO_LARGE } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { getGoogleTokens } from "@sbfn/google-auth/getGoogleTokens.ts";
import { getAuthorizedSheetSource } from "@sbfn/google-sheets/getAuthorizedSheetSource/getAuthorizedSheetSource.ts";
import { getDatasetOwnerAccessToken } from "@sbfn/google-sheets/getDatasetOwnerAccessToken/getDatasetOwnerAccessToken.ts";
import { makeGoogleSheetErrorResponse } from "@sbfn/google-sheets/makeGoogleSheetErrorResponse/makeGoogleSheetErrorResponse.ts";
import { google } from "googleapis";
import { string } from "zod";
import {
  GOOGLE_SHEET_MAX_EXPORT_BYTES,
  getGoogleSheetVersion,
  getStoredGoogleSheetTabCsv,
} from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveClient.ts";
import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { GoogleSheetsAPI } from "@sbfn/google-sheets/GoogleSheetsRoutes.types.ts";

/**
 * Lets the browser read the source version off a cross-origin response,
 * which otherwise exposes only the CORS-safelisted headers.
 */
const EXPOSED_HEADERS = "X-Ava-Source-Version";

/** The caller's session and the service role, as every dataset route has. */
type DatasetRouteClients = {
  datasetId: string;
  supabaseClient: AvaSupabaseClient;
  supabaseAdminClient: AvaSupabaseClient;
};

/**
 * Runs one dataset read, answering a Google failure with its typed error
 * body. Anything else is rethrown so MiniServer still reports a real 500
 * instead of this masking a bug.
 */
async function _respondWithGoogleSheetErrors(
  read: () => Promise<Response>,
): Promise<Response> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof GoogleDriveError) {
      return makeGoogleSheetErrorResponse(error);
    }
    throw error;
  }
}

/**
 * The dataset's stored tab as CSV, read with the Google grant of the account
 * that added it once the caller's own access to the dataset is checked.
 */
async function _readDatasetSheetCsv(
  options: Readonly<DatasetRouteClients>,
): Promise<Response> {
  const source = await getAuthorizedSheetSource(options);
  const accessToken = await getDatasetOwnerAccessToken({
    supabaseAdminClient: options.supabaseAdminClient,
    googleAccountId: source.googleAccountId,
  });
  const { csvText, sourceVersion } = await getStoredGoogleSheetTabCsv({
    fileId: source.googleDocumentId,
    sheetName: source.sheetName,
    accessToken,
  });
  if (
    new TextEncoder().encode(csvText).byteLength > GOOGLE_SHEET_MAX_EXPORT_BYTES
  ) {
    throw new GoogleDriveError({
      code: "export-too-large",
      status: PAYLOAD_TOO_LARGE,
      reason: "csv-over-cap",
    });
  }
  return new Response(csvText, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Access-Control-Expose-Headers": EXPOSED_HEADERS,
      "Content-Type": "text/csv",
      "X-Ava-Source-Version": sourceVersion,
    },
  });
}

/** The dataset's Drive `File.version`, checked the same way as its rows. */
async function _readDatasetSheetVersion(
  options: Readonly<DatasetRouteClients>,
): Promise<Response> {
  const source = await getAuthorizedSheetSource(options);
  const accessToken = await getDatasetOwnerAccessToken({
    supabaseAdminClient: options.supabaseAdminClient,
    googleAccountId: source.googleAccountId,
  });
  const sourceVersion = await getGoogleSheetVersion({
    fileId: source.googleDocumentId,
    accessToken,
  });
  return new Response(JSON.stringify({ sourceVersion }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Reads Google Sheets. The two dataset routes are how every saved Sheets
 * dataset is read after import: anyone who may see the dataset reads it with
 * the Google grant of the account that added it, server-side, so that grant
 * never reaches anyone else's browser. Adding a dataset is what consents to
 * sharing its rows this way.
 */
export const GoogleSheetsRoutes = defineRoutes<GoogleSheetsAPI>(
  "google-sheets",
  {
    "/datasets/:datasetId/csv": {
      GET: GET({
        path: "/datasets/:datasetId/csv",
        schema: { datasetId: string().uuid() },
      }).action(
        async ({
          pathParams,
          supabaseClient,
          supabaseAdminClient,
        }): Promise<Response> => {
          return await _respondWithGoogleSheetErrors(() => {
            return _readDatasetSheetCsv({
              datasetId: pathParams.datasetId,
              supabaseClient,
              supabaseAdminClient,
            });
          });
        },
      ),
    },

    "/datasets/:datasetId/version": {
      GET: GET({
        path: "/datasets/:datasetId/version",
        schema: { datasetId: string().uuid() },
      }).action(
        async ({
          pathParams,
          supabaseClient,
          supabaseAdminClient,
        }): Promise<Response> => {
          return await _respondWithGoogleSheetErrors(() => {
            return _readDatasetSheetVersion({
              datasetId: pathParams.datasetId,
              supabaseClient,
              supabaseAdminClient,
            });
          });
        },
      ),
    },

    // TODO(jpsyx): update this to use DuckDB WASM so we can send the data as
    // a parquet binary blob instead.
    "/:id": {
      GET: GET({
        path: "/:id",
        schema: {
          id: string(),
        },
      }).action(async ({ pathParams, supabaseClient, user }) => {
        // TODO(jpsyx): this should support receiving an optional
        // `google_account_id` so we only get and refresh the appropriate token
        const tokens = await getGoogleTokens({
          supabaseClient,
          userId: user.id,
        });

        if (isNonEmptyArray(tokens)) {
          // TODO(jpsyx): for now, we will select the first token until we
          // support multiple google accounts
          const token = tokens[0];
          const googleAuthClient = getGoogleAuthClient(token);

          const SheetsAPI = google.sheets({
            version: "v4",
            auth: googleAuthClient,
          });

          // get the spreadsheet object
          const spreadsheet = await SheetsAPI.spreadsheets.get({
            spreadsheetId: pathParams.id,
          });

          const sheets =
            spreadsheet.data.sheets
              ?.map(({ properties }) => {
                if (
                  typeof properties?.sheetId === "number" &&
                  typeof properties?.title === "string" &&
                  // only allow traditional GRID sheets
                  properties?.sheetType === "GRID"
                ) {
                  return {
                    sheetId: properties.sheetId,
                    name: properties.title,
                  };
                }
                return undefined;
              })
              .filter((sheet) => {
                return sheet !== undefined;
              }) ?? [];

          assertIsNonEmptyArray(sheets, "No sheets found");

          const firstSpreadsheet = sheets[0];
          if (!firstSpreadsheet) {
            throw new Error("No spreadsheets found");
          }

          // TODO(jpsyx): google API limits to only 10 MB of data
          // transferred per read request. We will need to handle pagination
          // for large sheets. Or simply return an error and say the sheet is
          // too large to connect to.
          const firstSheet = await SheetsAPI.spreadsheets.values.get({
            spreadsheetId: pathParams.id,
            range: firstSpreadsheet.name,
          });

          // TODO(jpsyx): we should look into caching (either with Redix or S3
          // storage with a cron job to delete sheets after 24 hours) so we can
          // avoid re-querying Google Sheets over and over again
          return {
            rows: firstSheet.data.values ?? [],
            sheetName: firstSpreadsheet.name,
            spreadsheetName: spreadsheet.data.properties?.title ?? "",
            availableSheets: sheets,
          };
        }

        throw new Error("No Google tokens found");
      }),
    },
  },
);
