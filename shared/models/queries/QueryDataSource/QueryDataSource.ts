/* eslint-disable @typescript-eslint/no-namespace */
import type {
  QueryDataSourceId,
  QueryDataSource as QueryDataSourceRead,
  QueryDataSourceTypedId,
} from "$/models/queries/QueryDataSource/QueryDataSource.types.ts";

/** Types describing data sources accepted by structured queries. */
export namespace QueryDataSource {
  export type T = QueryDataSourceRead;
  export type Id = QueryDataSourceId;
  export type TypedId = QueryDataSourceTypedId;
}
