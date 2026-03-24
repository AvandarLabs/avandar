import { Model } from "@models/Model/Model.ts";
import { uuid } from "../../../../lib/uuid.ts";
import { toRawDuckDBQuery } from "./toRawDuckDBQuery.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
  StructuredQueryRead,
} from "../StructuredQuery.types.ts";

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
