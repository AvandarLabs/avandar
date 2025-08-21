import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { LocalCSVDatasetParsers } from "@/models/datasets/LocalCSVDataset";

export const LocalCSVClient = createSupabaseCRUDClient({
  modelName: "LocalCSVDataset",
  tableName: "datasets__local_csv",
  dbTablePrimaryKey: "id",
  parsers: LocalCSVDatasetParsers,
});
