import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

/**
 * Routes for reading Google Sheets. The two dataset routes answer with raw
 * CSV or a typed error body rather than JSON from `responseSuccess`, which is
 * why their `returnType` is `Response`.
 */
export type GoogleSheetsAPI = APITypeDef<
  "google-sheets",
  ["/datasets/:datasetId/csv", "/datasets/:datasetId/version", "/:id"],
  {
    "/datasets/:datasetId/csv": {
      GET: {
        pathParams: { datasetId: string };
        returnType: Response;
      };
    };
    "/datasets/:datasetId/version": {
      GET: {
        pathParams: { datasetId: string };
        returnType: Response;
      };
    };
    "/:id": {
      GET: {
        pathParams: {
          id: string;
        };
        returnType: {
          rows: unknown[][];
          sheetName: string;
          spreadsheetName: string;
          availableSheets: Array<{
            sheetId: number;
            name: string;
          }>;
        };
      };
    };
  }
>;
