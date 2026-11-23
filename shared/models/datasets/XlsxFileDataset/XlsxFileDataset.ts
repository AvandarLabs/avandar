/* oxlint-disable typescript/no-namespace */
import type {
  XlsxFileDatasetId,
  XlsxFileDatasetModel,
} from "$/models/datasets/XlsxFileDataset/XlsxFileDataset.types.ts";

export { XlsxFileDatasetParsers } from "$/models/datasets/XlsxFileDataset/XlsxFileDatasetParsers.ts";

export namespace XlsxFileDataset {
  export type T<K extends keyof XlsxFileDatasetModel = "Read"> =
    XlsxFileDatasetModel[K];
  export type Id = XlsxFileDatasetId;
}
