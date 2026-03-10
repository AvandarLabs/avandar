import { Model } from "@avandar/models";
import { uuid } from "../../../lib/uuid.ts";
import type {
  PartialStructuredQuery,
  StructuredQueryId,
} from "./StructuredQuery.types.ts";

export const StructuredQueries = {
  makeEmpty: (): PartialStructuredQuery => {
    return Model.make("StructuredQuery", {
      id: uuid<StructuredQueryId>(),
      version: 1,
      dataSource: undefined,
      queryColumns: [],
      orderByColumn: undefined,
      orderByDirection: undefined,
      aggregations: {},
    } as const);
  },
};
