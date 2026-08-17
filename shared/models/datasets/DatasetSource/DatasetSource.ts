/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DatasetSourceModel,
  DatasetSourceRegistry,
  DatasetSourceType,
  ImportableDatasetSourceType,
  ImportTimeColumnEditableDatasetSourceType,
  ManuallyUploadableDatasetSourceType,
} from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

export { DatasetSourceModule as DatasetSource } from "$/models/datasets/DatasetSource/DatasetSourceModule/DatasetSourceModule.ts";

export namespace DatasetSource {
  export type T<
    TSourceType extends DatasetSourceType = DatasetSourceType,
    K extends "Read" | "Insert" | "Update" = "Read",
  > = DatasetSourceModel<TSourceType, K>;
  export type Registry = DatasetSourceRegistry;
  export type SourceType = DatasetSourceType;
  export type ImportableSourceType = ImportableDatasetSourceType;
  export type ImportTimeColumnEditableSourceType =
    ImportTimeColumnEditableDatasetSourceType;
  export type ManuallyUploadableSourceType =
    ManuallyUploadableDatasetSourceType;
}
