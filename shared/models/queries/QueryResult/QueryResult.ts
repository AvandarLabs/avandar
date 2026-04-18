/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  QueryResultId,
  QueryResult as QueryResultT,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

export { QueryResultModule as QueryResult } from "$/models/queries/QueryResult/QueryResultModule.ts";

export namespace QueryResult {
  export type T = QueryResultT;
  export type Id = QueryResultId;
}
