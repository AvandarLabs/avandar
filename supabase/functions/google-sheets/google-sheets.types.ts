import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type GoogleSheetsAPI = APITypeDef<
  "google-sheets",
  ["/:id"],
  {
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
