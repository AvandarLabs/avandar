import type { CsvFileDatasetModel } from "$/models/datasets/CsvFileDataset/CsvFileDataset.types.ts";
import type { GoogleSheetsDatasetModel } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts";
import type { OpenDataDatasetModel } from "$/models/datasets/OpenDataDataset/OpenDataDataset.types.ts";
import type { VirtualDatasetModel } from "$/models/datasets/VirtualDataset/VirtualDataset.types.ts";
import type { XlsxFileDatasetModel } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset.types.ts";
import type { Enums } from "$/types/database.types.ts";

export type DatasetSourceType = Enums<"datasets__source_type">;
export type ImportableDatasetSourceType = Exclude<
  DatasetSourceType,
  "virtual" | "open_data"
>;

export type DatasetSourceRegistry<
  K extends "Read" | "Insert" | "Update" = "Read",
> = {
  csv_file: CsvFileDatasetModel[K];
  google_sheets: GoogleSheetsDatasetModel[K];
  open_data: OpenDataDatasetModel[K];
  virtual: VirtualDatasetModel[K];
  xlsx_file: XlsxFileDatasetModel[K];
};

/**
 * The DatasetSource model is a union of each individual dataset source
 * model (e.g. CsvFileDatasetModel, GoogleSheetsDatasetModel, etc.)
 */
export type DatasetSourceModel<
  SourceType extends DatasetSourceType = DatasetSourceType,
  K extends "Read" | "Insert" | "Update" = "Read",
> = DatasetSourceRegistry<K>[SourceType];
