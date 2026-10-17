import { CatalogListingColumnParsers } from "$/models/catalog-listings/CatalogListingColumn/CatalogListingColumnParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CatalogListingColumnClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CatalogListingColumn",
    tableName: "catalog_listings__dataset_column",
    dbTablePrimaryKey: "id",
    parsers: CatalogListingColumnParsers,
  }),
);
