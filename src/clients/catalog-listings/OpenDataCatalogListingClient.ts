import { OpenDataCatalogListingParsers } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListingParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const OpenDataCatalogListingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "OpenDataCatalogListing",
    tableName: "catalog_listings__open_data",
    dbTablePrimaryKey: "id",
    parsers: OpenDataCatalogListingParsers,
  }),
);
