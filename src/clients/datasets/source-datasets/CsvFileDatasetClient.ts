import { CsvFileDatasetParsers } from "$/models/datasets/CsvFileDataset/CsvFileDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const CsvFileDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CsvFileDataset",
    tableName: "datasets__csv_file",
    dbTablePrimaryKey: "id",
    parsers: CsvFileDatasetParsers,
  }),
);
