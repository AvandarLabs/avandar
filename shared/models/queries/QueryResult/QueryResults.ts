import type { QueryResult } from "./QueryResult.types.ts";

type IQueryResults = {
  makeEmpty: () => QueryResult;
};

export const QueryResults: IQueryResults = {
  makeEmpty: (): QueryResult => {
    return {
      columns: [],
      data: [],
      numRows: 0,
    };
  },
};
