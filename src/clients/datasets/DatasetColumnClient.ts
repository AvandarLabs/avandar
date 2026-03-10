import { createSupabaseCRUDClient } from "@avandar/clients";
import { DatasetColumnParsers } from "$/models/datasets/DatasetColumn/DatasetColumnParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const DatasetColumnClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "DatasetColumn",
    tableName: "dataset_columns",
    dbTablePrimaryKey: "id",
    parsers: DatasetColumnParsers,
  }),
);
