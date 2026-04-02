/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CSVFileDatasetId,
  CSVFileDatasetModel,
} from "$/models/datasets/CSVFileDataset/CSVFileDataset.types.ts";

export { CSVFileDatasetParsers } from "$/models/datasets/CSVFileDataset/CSVFileDatasetParsers.ts";

export namespace CSVFileDataset {
  export type T<K extends keyof CSVFileDatasetModel = "Read"> =
    CSVFileDatasetModel[K];
  export type Id = CSVFileDatasetId;
}
