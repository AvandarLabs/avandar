/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DatasetSourceModel,
  DatasetSourceRegistry,
  DatasetSourceType,
  ImportableDatasetSourceType,
  ManuallyUploadableDatasetSourceType,
  NonReconstructableDatasetSourceType,
} from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

export { DatasetSourceModule as DatasetSource } from "$/models/datasets/DatasetSource/DatasetSourceModule.ts";
export { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention.ts";

export namespace DatasetSource {
  export type T<
    TSourceType extends DatasetSourceType = DatasetSourceType,
    K extends "Read" | "Insert" | "Update" = "Read",
  > = DatasetSourceModel<TSourceType, K>;
  export type Registry = DatasetSourceRegistry;
  export type SourceType = DatasetSourceType;
  export type ImportableSourceType = ImportableDatasetSourceType;
  export type ManuallyUploadableSourceType =
    ManuallyUploadableDatasetSourceType;
  export type NonReconstructableSourceType =
    NonReconstructableDatasetSourceType;
}
