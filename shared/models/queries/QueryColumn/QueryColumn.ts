/* oxlint-disable typescript/no-namespace, import/export */
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";

export { QueryColumnModule as QueryColumn } from "$/models/queries/QueryColumn/QueryColumnModule.ts";

export namespace QueryColumn {
  export type T = QueryColumnRead;
  export type Id = QueryColumnId;
}
