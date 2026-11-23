import { uuid } from "$/lib/uuid.ts";
import type {
  QueryResult,
  QueryResultColumn,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

type IQueryResultModule = {
  makeEmpty: () => QueryResult;
  /**
   * Whether a result column is a LIST, such as a case type field that keeps
   * every value. Use it to keep a list out of an operation that fails on one,
   * for example a filter.
   */
  isListColumn: (column: QueryResultColumn) => boolean;
};

export const QueryResultModule: IQueryResultModule = {
  makeEmpty: (): QueryResult => {
    return {
      id: uuid() as QueryResultId,
      columns: [],
      data: [],
      numRows: 0,
    };
  },

  isListColumn: (column: QueryResultColumn): boolean => {
    return column.isArray === true;
  },
};
