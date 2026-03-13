import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { GoogleSheetsDatasetParsers } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const GoogleSheetsDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "GoogleSheetsDataset",
    tableName: "datasets__google_sheets",
    dbTablePrimaryKey: "id",
    parsers: GoogleSheetsDatasetParsers,
  }),
);
