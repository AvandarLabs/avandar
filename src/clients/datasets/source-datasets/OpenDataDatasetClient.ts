import { OpenDataDatasetParsers } from "$/models/datasets/OpenDataDataset/OpenDataDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const OpenDataDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "OpenDataDataset",
    tableName: "datasets__open_data",
    dbTablePrimaryKey: "id",
    parsers: OpenDataDatasetParsers,
  }),
);
