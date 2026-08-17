import { PdfFileDatasetParsers } from "$/models/datasets/PdfFileDataset/PdfFileDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const PdfFileDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    dbTablePrimaryKey: "id",
    modelName: "PdfFileDataset",
    parsers: PdfFileDatasetParsers,
    tableName: "datasets__pdf_file",
  }),
);
