import { Model } from "@models/Model/Model.ts";
import { uuid } from "$/lib/uuid.ts";
import { toRawDuckDBQuery } from "$/models/queries/StructuredQuery/StructuredQueryUtils/toRawDuckDBQuery.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
  StructuredQueryRead,
} from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export const StructuredQueryUtils = {
  makeEmpty: (): PartialStructuredQuery => {
    return Model.make("StructuredQuery", {
      id: uuid<StructuredQueryId>(),
      version: 1,
      dataSource: undefined,
      queryColumns: [],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: {},
      offset: undefined,
      limit: undefined,
    } as const);
  },

  toRawDuckDBQuery: (query: StructuredQueryRead): string => {
    return toRawDuckDBQuery(query);
  },
};
