import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { XlsFileDatasetParsers } from "$/models/datasets/XlsFileDataset/XlsFileDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const XlsFileDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    dbTablePrimaryKey: "id",
    modelName: "XlsFileDataset",
    parsers: XlsFileDatasetParsers,
    tableName: "datasets__xls_file",
  }),
);
