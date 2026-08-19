/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PdfFileDatasetId,
  PdfFileDatasetModel,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";

export { PdfFileDatasetParsers } from "$/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts";

export namespace PdfFileDataset {
  export type T<K extends keyof PdfFileDatasetModel = "Read"> =
    PdfFileDatasetModel[K];
  export type Id = PdfFileDatasetId;
}
