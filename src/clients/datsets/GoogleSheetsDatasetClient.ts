import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { GoogleSheetsDatasetParsers } from "@/models/datasets/GoogleSheetsDataset";

export const GoogleSheetsDatasetClient = createSupabaseCRUDClient({
  modelName: "GoogleSheetsDataset",
  tableName: "datasets__google_sheets",
  dbTablePrimaryKey: "id",
  parsers: GoogleSheetsDatasetParsers,
});
