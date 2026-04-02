/* eslint-disable @typescript-eslint/no-namespace */
import type {
  VirtualDatasetId,
  VirtualDatasetModel,
} from "$/models/datasets/VirtualDataset/VirtualDataset.types.ts";

export { VirtualDatasetParsers } from "$/models/datasets/VirtualDataset/VirtualDatasetParsers.ts";

export namespace VirtualDataset {
  export type T<K extends keyof VirtualDatasetModel = "Read"> =
    VirtualDatasetModel[K];
  export type Id = VirtualDatasetId;
}
