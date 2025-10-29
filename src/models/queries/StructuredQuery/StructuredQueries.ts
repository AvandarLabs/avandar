import { Models } from "@/models/Model";
import {
  PartialStructuredQuery,
  StructuredQueryId,
} from "./StructuredQuery.types";
import { uuid } from "@/lib/utils/uuid";

export const StructuredQueries = {
  makeEmpty: (): PartialStructuredQuery => {
    return Models.make(
      "StructuredQuery",
      {
        id: uuid<StructuredQueryId>(),
        version: 1,
        dataSource: undefined,
        queryColumns: [],
        orderByColumn: undefined,
        orderByDirection: undefined,
        aggregations: {},
      } as const,
    );
  },
};
