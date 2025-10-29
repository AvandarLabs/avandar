import type { QueryResult } from "./QueryResult.types";

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
