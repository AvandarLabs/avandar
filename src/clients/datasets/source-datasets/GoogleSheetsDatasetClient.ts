import { GoogleSheetsDatasetParsers } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const GoogleSheetsDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "GoogleSheetsDataset",
    tableName: "datasets__google_sheets",
    dbTablePrimaryKey: "id",
    parsers: GoogleSheetsDatasetParsers,
  }),
);
