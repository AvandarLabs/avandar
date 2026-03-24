import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { VirtualDatasetParsers } from "$/models/datasets/VirtualDataset/VirtualDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const VirtualDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "VirtualDataset",
    tableName: "datasets__virtual",
    dbTablePrimaryKey: "id",
    parsers: VirtualDatasetParsers,
  }),
);
