import { createSupabaseCRUDClient } from "@clients";
import { CsvFileDatasetParsers } from "$/models/datasets/CsvFileDataset/CsvFileDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CsvFileDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "CsvFileDataset",
    tableName: "datasets__csv_file",
    dbTablePrimaryKey: "id",
    parsers: CsvFileDatasetParsers,
  }),
);
