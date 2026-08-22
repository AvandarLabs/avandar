import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import { makeQueryFilterNodeId } from "$/models/queries/StructuredQuery/makeQueryFilterNodeId.ts";
import {
  EMPTY_QUERY_FILTER,
  isEmptyQueryFilter,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { toRawDuckDbQuery } from "$/models/queries/StructuredQuery/toRawDuckDbQuery.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
  StructuredQueryRead,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export const StructuredQueryModule = {
  /** An empty filter tree, for a query that filters nothing. */
  EMPTY_FILTER: EMPTY_QUERY_FILTER,

  /** True when a filter tree carries no rules at any depth. */
  isEmptyFilter: isEmptyQueryFilter,

  /** A fresh id for one filter tree node. See `makeQueryFilterNodeId`. */
  makeFilterNodeId: makeQueryFilterNodeId,

  makeEmpty: (): PartialStructuredQuery => {
    return Model.make("StructuredQuery", {
      id: uuid<StructuredQueryId>(),
      version: 1,
      dataSource: undefined,
      queryColumns: [],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: {},
      filters: EMPTY_QUERY_FILTER,
      having: EMPTY_QUERY_FILTER,
      joins: [],
      offset: undefined,
      limit: undefined,
    } as const);
  },

  toRawDuckDbQuery: (query: StructuredQueryRead): string => {
    return toRawDuckDbQuery(query);
  },
};
