/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { UnknownObject } from "@avandar/utils";
import type {
  QueryResultColumn,
  QueryResultId,
  QueryResult as QueryResultT,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

export { QueryResultModule as QueryResult } from "$/models/queries/QueryResult/QueryResultModule.ts";

export namespace QueryResult {
  export type T<TRow extends UnknownObject = UnknownObject> =
    QueryResultT<TRow>;
  export type Id = QueryResultId;
  export type Column = QueryResultColumn;
}
