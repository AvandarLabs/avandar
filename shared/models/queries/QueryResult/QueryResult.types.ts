import type { UnknownObject, UUID } from "@utils/types/common.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.types.ts";

export type QueryResultId = UUID<"QueryResult">;

export type QueryResultColumn = {
  name: string;
  dataType: AvaDataType;
};

export type QueryResult<T extends UnknownObject = UnknownObject> = {
  id: QueryResultId;
  columns: QueryResultColumn[];
  data: T[];

  /** The number of rows in the `data` array */
  numRows: number;
};

export type QueryResultPage<T extends UnknownObject = UnknownObject> =
  QueryResult<T> & {
    /**
     * The total number of rows in the data store (for the query that
     * generated this page)
     */
    totalRows: number;

    /**
     * The total number of pages in the data store (for the query that
     * generated this page)
     */
    totalPages: number;

    /**
     * The next page number, or undefined if there is no next page
     */
    nextPage: number | undefined;

    /** The current page number */
    pageNum: number;

    /**
     * The previous page number, or undefined if there is no previous page
     */
    prevPage: number | undefined;
  };
