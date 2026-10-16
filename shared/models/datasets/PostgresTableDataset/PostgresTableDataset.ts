/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PostgresTableDatasetId,
  PostgresTableDatasetModel,
  PostgresTableRelationKind,
} from "$/models/datasets/PostgresTableDataset/PostgresTableDataset.types.ts";

export { PostgresTableDatasetParsers } from "$/models/datasets/PostgresTableDataset/PostgresTableDatasetParsers.ts";

export namespace PostgresTableDataset {
  export type T<K extends keyof PostgresTableDatasetModel = "Read"> =
    PostgresTableDatasetModel[K];
  export type Id = PostgresTableDatasetId;
  export type RelationKind = PostgresTableRelationKind;
}
