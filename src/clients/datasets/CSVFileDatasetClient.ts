import { createSupabaseCRUDClient } from "@avandar/clients";
import { CSVFileDatasetParsers } from "$/models/datasets/CSVFileDataset/CSVFileDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CSVFileDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "CSVFileDataset",
    tableName: "datasets__csv_file",
    dbTablePrimaryKey: "id",
    parsers: CSVFileDatasetParsers,
  }),
);
