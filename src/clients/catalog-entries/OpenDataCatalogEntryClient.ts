import { createRdbCrudClient } from "@clients/RdbCrudClient/createRdbCrudClient";
import { OpenDataCatalogEntryParsers } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const OpenDataCatalogEntryClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "OpenDataCatalogEntry",
    tableName: "catalog_entries__open_data",
    dbTablePrimaryKey: "id",
    parsers: OpenDataCatalogEntryParsers,
  }),
);
