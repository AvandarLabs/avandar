import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { CatalogDatasetColumnParsers } from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumnParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CatalogDatasetColumnClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "CatalogDatasetColumn",
    tableName: "catalog_entries__dataset_column",
    dbTablePrimaryKey: "id",
    parsers: CatalogDatasetColumnParsers,
  }),
);
