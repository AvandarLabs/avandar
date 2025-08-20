import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { DatasetColumnParsers } from "@/models/datasets/DatasetColumn";

export const DatasetColumnClient = createSupabaseCRUDClient({
  modelName: "DatasetColumn",
  tableName: "dataset_columns",
  dbTablePrimaryKey: "id",
  parsers: DatasetColumnParsers,
});
