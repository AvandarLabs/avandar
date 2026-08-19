import type { CsvFileDatasetModel } from "$/models/datasets/CsvFileDataset/CsvFileDataset.types.ts";
import type { GoogleSheetsDatasetModel } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts";
import type { OpenDataDatasetModel } from "$/models/datasets/OpenDataDataset/OpenDataDataset.types.ts";
import type { PdfFileDatasetModel } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";
import type { VirtualDatasetModel } from "$/models/datasets/VirtualDataset/VirtualDataset.types.ts";
import type { XlsxFileDatasetModel } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset.types.ts";
import type { Enums } from "$/types/database.types.ts";

export type DatasetSourceType = Enums<"datasets__source_type">;
export type ImportableDatasetSourceType = Exclude<
  DatasetSourceType,
  "virtual" | "open_data"
>;

export type CanBeOfflineOnlyDatasetSourceType = Extract<
  DatasetSourceType,
  "csv_file" | "xlsx_file" | "pdf_file"
>;

export type ManuallyUploadableDatasetSourceType = Extract<
  DatasetSourceType,
  "csv_file" | "xlsx_file" | "pdf_file"
>;

/**
 * Source types whose original uploaded file CANNOT be reconstructed from the
 * stored parquet blob plus the stored parse metadata, and which therefore
 * must retain the original file.
 *
 * The deciding question is only ever: given the parquet and the metadata we
 * persist, could we rebuild the file the user handed us?
 *
 * - `csv_file` / `xlsx_file`: yes. The parquet holds every value and the
 *   parse options hold every setting, so we deliberately do not keep the
 *   original.
 * - `pdf_file`: no. We extract one table out of a document that may hold
 *   dozens of other things. Discarding the original would permanently
 *   foreclose extracting anything else from an already-imported file.
 *
 * See Linear AVA-317.
 */
export type NonReconstructableDatasetSourceType = Extract<
  DatasetSourceType,
  "pdf_file"
>;

export type DatasetSourceRegistry<
  K extends "Read" | "Insert" | "Update" = "Read",
> = {
  csv_file: CsvFileDatasetModel[K];
  google_sheets: GoogleSheetsDatasetModel[K];
  open_data: OpenDataDatasetModel[K];
  pdf_file: PdfFileDatasetModel[K];
  virtual: VirtualDatasetModel[K];
  xlsx_file: XlsxFileDatasetModel[K];
};

export type CanBeOfflineOnlyDatasetSourceModel =
  DatasetSourceRegistry[CanBeOfflineOnlyDatasetSourceType];

/**
 * The DatasetSource model is a union of each individual dataset source
 * model (e.g. CsvFileDatasetModel, GoogleSheetsDatasetModel, etc.)
 */
export type DatasetSourceModel<
  SourceType extends DatasetSourceType = DatasetSourceType,
  K extends "Read" | "Insert" | "Update" = "Read",
> = DatasetSourceRegistry<K>[SourceType];
