/* eslint-disable @typescript-eslint/no-namespace */
import type {
  XlsFileDatasetId,
  XlsFileDatasetModel,
} from "$/models/datasets/XlsFileDataset/XlsFileDataset.types.ts";

export { XlsFileDatasetParsers } from "$/models/datasets/XlsFileDataset/XlsFileDatasetParsers.ts";

export namespace XlsFileDataset {
  export type T<K extends keyof XlsFileDatasetModel = "Read"> =
    XlsFileDatasetModel[K];
  export type Id = XlsFileDatasetId;
}
