import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { OpenDataDatasetParsers } from "$/models/datasets/OpenDataDataset/OpenDataDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const OpenDataDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "OpenDataDataset",
    tableName: "datasets__open_data",
    dbTablePrimaryKey: "id",
    parsers: OpenDataDatasetParsers,
  }),
);
