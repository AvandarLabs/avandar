import { createSupabaseCRUDClient } from "@avandar/clients";
import { GoogleSheetsDatasetParsers } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";

export const GoogleSheetsDatasetClient = createSupabaseCRUDClient({
  dbClient: AvaSupabase.DB,
  modelName: "GoogleSheetsDataset",
  tableName: "datasets__google_sheets",
  dbTablePrimaryKey: "id",
  parsers: GoogleSheetsDatasetParsers,
});
