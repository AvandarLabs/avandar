import { createRdbCrudClient } from "@clients/RdbCrudClient/createRdbCrudClient";
import { CatalogDatasetColumnParsers } from "$/models/catalog-entries/CatalogDatasetColumn/CatalogDatasetColumnParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CatalogDatasetColumnClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CatalogDatasetColumn",
    tableName: "catalog_entries__dataset_column",
    dbTablePrimaryKey: "id",
    parsers: CatalogDatasetColumnParsers,
  }),
);
