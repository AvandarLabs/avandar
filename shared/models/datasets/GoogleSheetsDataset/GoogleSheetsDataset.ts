/* eslint-disable @typescript-eslint/no-namespace */
import type {
  GoogleSheetsDatasetId,
  GoogleSheetsDatasetModel,
} from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types.ts";

export { GoogleSheetsDatasetParsers } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDatasetParsers.ts";

export namespace GoogleSheetsDataset {
  export type T<K extends keyof GoogleSheetsDatasetModel = "Read"> =
    GoogleSheetsDatasetModel[K];
  export type Id = GoogleSheetsDatasetId;
}
