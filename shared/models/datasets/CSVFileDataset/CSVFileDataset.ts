/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CsvFileDatasetId,
  CsvFileDatasetModel,
} from "$/models/datasets/CsvFileDataset/CsvFileDataset.types.ts";

export { CsvFileDatasetParsers } from "$/models/datasets/CsvFileDataset/CsvFileDatasetParsers.ts";

export namespace CsvFileDataset {
  export type T<K extends keyof CsvFileDatasetModel = "Read"> =
    CsvFileDatasetModel[K];
  export type Id = CsvFileDatasetId;
}
