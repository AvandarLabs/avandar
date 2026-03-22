/* eslint-disable @typescript-eslint/no-namespace */
import type {
  VirtualDatasetId,
  VirtualDatasetModel,
} from "./VirtualDataset.types.ts";

export namespace VirtualDataset {
  export type T<K extends keyof VirtualDatasetModel = "Read"> =
    VirtualDatasetModel[K];
  export type Id = VirtualDatasetId;
}
