import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { VirtualDatasetParsers } from "$/models/datasets/VirtualDataset/VirtualDatasetParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const VirtualDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "VirtualDataset",
    tableName: "datasets__virtual",
    dbTablePrimaryKey: "id",
    parsers: VirtualDatasetParsers,
  }),
);
