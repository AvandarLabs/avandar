import type { CSVFileDataset } from "../CSVFileDataset/CSVFileDataset.types.ts";
import type { GoogleSheetsDataset } from "../GoogleSheetsDataset/GoogleSheetsDataset.types.ts";
import type { VirtualDataset } from "../VirtualDataset/VirtualDataset.ts";
import type { Enums } from "$/types/database.types.ts";

export type DatasetSourceType = Enums<"datasets__source_type">;

export type DatasetSourceRegistry<
  K extends "Read" | "Insert" | "Update" = "Read",
> = {
  csv_file: CSVFileDataset<K>;
  google_sheets: GoogleSheetsDataset<K>;
  virtual: VirtualDataset.T<K>;
};

export type DatasetSourceModel<
  SourceType extends DatasetSourceType = DatasetSourceType,
  K extends "Read" | "Insert" | "Update" = "Read",
> = DatasetSourceRegistry<K>[SourceType];
