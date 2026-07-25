import { DatasetColumnParsers } from "$/models/datasets/DatasetColumn/DatasetColumnParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const DatasetColumnClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DatasetColumn",
    tableName: "dataset_columns",
    dbTablePrimaryKey: "id",
    parsers: DatasetColumnParsers,
  }),
);
