/* eslint-disable @typescript-eslint/no-namespace */
import type {
  OpenDataDatasetId,
  OpenDataDatasetModel,
} from "$/models/datasets/OpenDataDataset/OpenDataDataset.types.ts";

export namespace OpenDataDataset {
  export type T<K extends keyof OpenDataDatasetModel = "Read"> =
    OpenDataDatasetModel[K];
  export type Id = OpenDataDatasetId;
}
