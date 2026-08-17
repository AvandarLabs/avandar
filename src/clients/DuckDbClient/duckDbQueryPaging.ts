import type {
  DuckDbStructuredQuery,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

type PageQueryParams = Omit<
  DuckDbStructuredQuery & {
    pageSize: number;
    pageNum: number;
    totalRows: number | undefined;
  },
  "limit" | "offset"
>;

type PageTotalRowsOptions = {
  client: DuckDbClientOperations;
  tableName: string;
  pageSize: number;
  pageNum: number;
  totalRows: number | undefined;
  pageData: QueryResult.T<UnknownRow>;
};

type RemainingQueryPagesOptions<T extends UnknownRow> = {
  callback: (page: QueryResult.Page<T>) => void | Promise<void>;
  client: DuckDbClientOperations;
  firstPage: QueryResult.Page<T>;
  query: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
    pageSize: number;
    selectColumnNames: DuckDbStructuredQuery["selectColumnNames"];
    groupByColumnNames: DuckDbStructuredQuery["groupByColumnNames"];
    aggregations: DuckDbStructuredQuery["aggregations"];
  };
};

async function _getPageTotalRows(
  options: Readonly<PageTotalRowsOptions>,
): Promise<number> {
  if (options.totalRows !== undefined) {
    return options.totalRows;
  }
  if (
    options.pageNum === 0 &&
    options.pageData.data.length < options.pageSize
  ) {
    return options.pageData.numRows;
  }
  return options.client.getTableRowCount({ tableName: options.tableName });
}

function _getPageNavigation(
  options: Readonly<{
    pageSize: number;
    pageNum: number;
    totalRows: number;
  }>,
): Pick<QueryResult.Page<UnknownRow>, "totalPages" | "nextPage" | "prevPage"> {
  const totalPages =
    options.totalRows === 0 ?
      1
    : Math.ceil(options.totalRows / options.pageSize);
  return {
    totalPages,
    nextPage:
      options.pageNum + 1 === totalPages ? undefined : options.pageNum + 1,
    prevPage: options.pageNum === 0 ? undefined : options.pageNum - 1,
  };
}

async function _getQueryPage<T extends UnknownRow>(
  client: DuckDbClientOperations,
  queryParams: Readonly<PageQueryParams>,
): Promise<QueryResult.Page<T>> {
  const { tableName, pageSize, pageNum, totalRows } = queryParams;
  const pageData = await client.runStructuredQuery<T>({
    ...queryParams,
    limit: pageSize,
    offset: pageSize * pageNum,
  });

  const totalRowsInSource = await _getPageTotalRows({
    client,
    tableName,
    pageSize,
    pageNum,
    totalRows,
    pageData,
  });
  return {
    ...pageData,
    totalRows: totalRowsInSource,
    ..._getPageNavigation({
      pageSize,
      pageNum,
      totalRows: totalRowsInSource,
    }),
    pageNum,
  };
}

async function _iterateRemainingQueryPages<T extends UnknownRow>(
  options: Readonly<RemainingQueryPagesOptions<T>>,
): Promise<{ numPages: number; numRows: number }> {
  let numPages = 1;
  let numRows = options.firstPage.numRows;
  let nextPageNum = options.firstPage.nextPage;
  while (nextPageNum !== undefined) {
    // Pages must be read in order: each one's `nextPage` cursor is only known
    // once the prior page has come back, so these awaits cannot be parallel.
    const queryPage = await _getQueryPage<T>(options.client, {
      ...options.query,
      pageNum: nextPageNum,
      totalRows: options.firstPage.totalRows,
    });
    await options.callback(queryPage);
    nextPageNum = queryPage.nextPage;
    numPages += 1;
    numRows += queryPage.numRows;
  }
  return { numPages, numRows };
}

/** Reads one page of a structured query, resolving its navigation cursors. */
export async function getDuckDbQueryPage<T extends UnknownRow>(
  client: DuckDbClientOperations,
  {
    selectColumnNames: selectColumns = "*",
    groupByColumnNames: groupByColumns = [],
    pageSize = 500,
    pageNum = 0,
    ...restOfStructuredQuery
  }: Omit<
    DuckDbStructuredQuery & { pageSize: number; pageNum: number },
    "limit" | "offset"
  >,
): Promise<QueryResult.Page<T>> {
  const page = await _getQueryPage<T>(client, {
    selectColumnNames: selectColumns,
    groupByColumnNames: groupByColumns,
    pageSize,
    pageNum,
    // pass `undefined` to mean we don't know the total number of rows
    // yet. We don't want to calculate this eagerly because there are cases
    // where we won't need to send a separate `count` query.
    totalRows: undefined,
    ...restOfStructuredQuery,
  });
  return page;
}

/** Reads every page of a structured query in order, invoking `callback`. */
export async function forEachDuckDbQueryPage<T extends UnknownRow>(
  options: Readonly<{
    client: DuckDbClientOperations;
    query: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
      pageSize?: number;
    };
    callback: (page: QueryResult.Page<T>) => void | Promise<void>;
  }>,
): Promise<{ numPages: number; numRows: number }> {
  const {
    selectColumnNames = "*",
    groupByColumnNames = [],
    aggregations = {},
    pageSize = 1000,
    ...restOfStructuredQuery
  } = options.query;
  const firstPage = await getDuckDbQueryPage<T>(options.client, {
    ...restOfStructuredQuery,
    selectColumnNames,
    groupByColumnNames,
    aggregations,
    pageSize,
    pageNum: 0,
  });
  await options.callback(firstPage);
  return _iterateRemainingQueryPages({
    callback: options.callback,
    client: options.client,
    firstPage,
    query: {
      ...restOfStructuredQuery,
      selectColumnNames,
      groupByColumnNames,
      aggregations,
      pageSize,
    },
  });
}
