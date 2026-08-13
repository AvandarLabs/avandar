/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  OrderByDirection as OrderByDirectionType,
  PartialStructuredQuery,
  StructuredQueryRead,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export { StructuredQueryModule as StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQueryModule.ts";

export namespace StructuredQuery {
  export type T = StructuredQueryRead;
  export type Partial = PartialStructuredQuery;
  export type OrderByDirection = OrderByDirectionType;
  export type FilterGroup = QueryFilterGroup;
}
