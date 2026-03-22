/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DatasetSourceModel,
  DatasetSourceRegistry,
  DatasetSourceType,
} from "./DatasetSource.types.ts";

export { DatasetSourceUtils as DatasetSource } from "./DatasetSourceUtils.ts";

export namespace DatasetSource {
  export type T<
    TSourceType extends DatasetSourceType = DatasetSourceType,
    K extends "Read" | "Insert" | "Update" = "Read",
  > = DatasetSourceModel<TSourceType, K>;
  export type Registry = DatasetSourceRegistry;
  export type SourceType = DatasetSourceType;
}
