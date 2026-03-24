import { uuid } from "$/lib/uuid.ts";
import type { QueryResult, QueryResultId } from "./QueryResult.types.ts";

type IQueryResults = {
  makeEmpty: () => QueryResult;
};

export const QueryResults: IQueryResults = {
  makeEmpty: (): QueryResult => {
    return {
      id: uuid() as QueryResultId,
      columns: [],
      data: [],
      numRows: 0,
    };
  },
};
