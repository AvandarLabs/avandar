import { DataCatalogDriveParsers } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDriveParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const DataCatalogDriveClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataCatalogDrive",
    tableName: "data_catalog_drives",
    dbTablePrimaryKey: "id",
    parsers: DataCatalogDriveParsers,
  }),
);
