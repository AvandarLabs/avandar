import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { OpenDataCatalogEntryParsers } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const OpenDataCatalogEntryClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "OpenDataCatalogEntry",
    tableName: "catalog_entries__open_data",
    dbTablePrimaryKey: "id",
    parsers: OpenDataCatalogEntryParsers,
  }),
);
