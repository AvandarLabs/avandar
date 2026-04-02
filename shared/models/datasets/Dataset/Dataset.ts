/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DatasetId,
  DatasetModel,
} from "$/models/datasets/Dataset/Dataset.types.ts";

export { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers.ts";

export namespace Dataset {
  export type T<K extends keyof DatasetModel = "Read"> = DatasetModel[K];
  export type Id = DatasetId;
}
