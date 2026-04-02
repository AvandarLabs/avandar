import { uuid } from "$/lib/uuid.ts";
import type {
  QueryResult,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types.ts";

type IQueryResultModule = {
  makeEmpty: () => QueryResult;
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
};
