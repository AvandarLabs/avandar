/* eslint-disable @typescript-eslint/no-namespace */
import type {
  CrosswalkDatasetId,
  CrosswalkDatasetModel,
} from "$/models/crosswalks/CrosswalkDataset/CrosswalkDataset.types.ts";

export { CrosswalkDatasetParsers } from "$/models/crosswalks/CrosswalkDataset/CrosswalkDatasetParsers.ts";

/** Public namespace for the datasets a crosswalk combines. */
export namespace CrosswalkDataset {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof CrosswalkDatasetModel = "Read"> =
    CrosswalkDatasetModel[K];

  /** Identifies one dataset's membership. */
  export type Id = CrosswalkDatasetId;
}
