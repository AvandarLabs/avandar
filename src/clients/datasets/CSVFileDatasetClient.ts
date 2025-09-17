import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { LocalCSVDatasetParsers } from "@/models/datasets/CSVFileDataset";

export const CSVFileDatasetClient = createSupabaseCRUDClient({
  modelName: "CSVFileDataset",
  tableName: "datasets__csv_file",
  dbTablePrimaryKey: "id",
  parsers: LocalCSVDatasetParsers,
});
