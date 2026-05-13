import { createSupabaseCRUDClient } from "@clients";
import { XlsxFileDatasetParsers } from "$/models/datasets/XlsxFileDataset/XlsxFileDatasetParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const XlsxFileDatasetClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    dbTablePrimaryKey: "id",
    modelName: "XlsxFileDataset",
    parsers: XlsxFileDatasetParsers,
    tableName: "datasets__xlsx_file",
  }),
);
