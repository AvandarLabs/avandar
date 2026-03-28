/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  PartialStructuredQuery,
  StructuredQueryRead,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export { StructuredQueryUtils as StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQueryUtils/StructuredQueryUtils.ts";

export namespace StructuredQuery {
  export type T = StructuredQueryRead;
  export type Partial = PartialStructuredQuery;
}
