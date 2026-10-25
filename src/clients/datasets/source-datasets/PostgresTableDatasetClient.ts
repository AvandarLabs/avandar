import { PostgresTableDatasetParsers } from "$/models/datasets/PostgresTableDataset/PostgresTableDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const PostgresTableDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PostgresTableDataset",
    tableName: "datasets__postgres_table",
    dbTablePrimaryKey: "id",
    parsers: PostgresTableDatasetParsers,
  }),
);
