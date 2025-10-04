import { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type API = APITypeDef<{
  "google-sheets": {
    "/:id": {
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
}>;
