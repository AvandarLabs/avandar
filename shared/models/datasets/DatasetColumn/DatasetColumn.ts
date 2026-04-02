/* eslint-disable @typescript-eslint/no-namespace */
import type {
  DatasetColumnId,
  DatasetColumnModel,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";

export { DatasetColumnParsers } from "$/models/datasets/DatasetColumn/DatasetColumnParsers.ts";

export namespace DatasetColumn {
  export type T<K extends keyof DatasetColumnModel = "Read"> =
    DatasetColumnModel[K];
  export type Id = DatasetColumnId;
}
