import { XlsxFileDatasetParsers } from "$/models/datasets/XlsxFileDataset/XlsxFileDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const XlsxFileDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    dbTablePrimaryKey: "id",
    modelName: "XlsxFileDataset",
    parsers: XlsxFileDatasetParsers,
    tableName: "datasets__xlsx_file",
  }),
);
