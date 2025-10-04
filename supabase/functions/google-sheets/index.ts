// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { google } from "npm:googleapis@154";
import { getGoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";
import {
  GET,
  MiniServer,
  MiniServerRoutesDef,
} from "../_shared/MiniServer/mod.ts";
import { getGoogleTokens } from "../google-auth/getGoogleTokens.ts";
import { API } from "./api.types.ts";

const Routes: MiniServerRoutesDef<API> = {
  "google-sheets": {
    // TODO(jpsyx): update this to use DuckDB WASM so we can send the data as
    // a parquet binary blob instead.
    "/:id": GET("/:id").action(async ({ urlParams, supabaseClient, user }) => {
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
        spreadsheetId: urlParams.id,
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
        spreadsheetId: urlParams.id,
        range: sheets[0].name,
      });

      // TODO(jpsyx): we should look into caching (either with Redix or S3
      // storage with a cron job to delete sheets after 24 hours) so we can
      // avoid re-querying Google Sheets over and over again
      return {
        rows: firstSheet.data.values ?? [],
        sheetName: sheets[0].name,
        spreadsheetName: spreadsheet.data.properties?.title ?? "",
        availableSheets: sheets,
      };
    }),
  },
};

MiniServer(Routes).serve();
