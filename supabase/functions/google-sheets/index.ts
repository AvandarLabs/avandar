// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { google } from "npm:googleapis@154";
import { getGoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";
import {
  MiniServer,
  MiniServerRoutesDef,
  POST,
} from "../_shared/MiniServer/MiniServer.ts";
import { getGoogleTokens } from "../google-auth/getGoogleTokens.ts";
import { API } from "./api.types.ts";

const NUM_PREVIEW_ROWS_LIMIT = 200;

const Routes: MiniServerRoutesDef<API> = {
  "google-sheets": {
    "/:id/preview": POST("/:id/preview").action(
      async ({ urlParams: pathParams, supabaseClient, user }) => {
        // TODO(jpsyx): this should support receiving an optional
        // `google_account_id` so we only get and refresh the appropriate token
        const tokens = await getGoogleTokens({
          supabaseClient,
          userId: user.id,
        });

        // TODO(jpsyx): for now, we will select the first token until we support
        // multiple google accounts
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

        // TODO(jpsyx): google API limits to only 10 MB of data
        // transferred per read request. We will need to handle pagination
        // for large sheets. Or simply return an error and say the sheet is
        // too large to connect to.
        const firstSheet = await SheetsAPI.spreadsheets.values.get({
          spreadsheetId: pathParams.id,
          range: `${sheets[0].name}!1:${NUM_PREVIEW_ROWS_LIMIT}`,
        });

        // TODO(jpsyx): we just had to read the entire sheet with the above
        // request, so we should figure out how to cache it, to avoid having to
        // read it all over again. We should look into Redis cacheing or using
        // S3 storage with a cron job to delete sheets after 24 hours.
        return {
          rows: (firstSheet.data.values ?? []).slice(0, NUM_PREVIEW_ROWS_LIMIT),
          sheetName: sheets[0].name,
          spreadsheetName: spreadsheet.data.properties?.title ?? "",
          availableSheets: sheets,
        };
      },
    ),
  },
};

MiniServer(Routes).serve();
