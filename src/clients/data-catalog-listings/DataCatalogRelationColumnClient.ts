import { DataCatalogRelationColumnParsers } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumnParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const DataCatalogRelationColumnClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataCatalogRelationColumn",
    tableName: "data_catalog_listings__relation_columns",
    dbTablePrimaryKey: "id",
    parsers: DataCatalogRelationColumnParsers,
  }),
);
