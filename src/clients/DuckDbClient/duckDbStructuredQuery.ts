import { objectEntries, prop } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { DuckDbQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { arrowTableToJS } from "@/clients/DuckDbClient/duckDbArrowResults";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  DuckDbColumnSchema,
  DuckDbStructuredQuery,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { Knex } from "knex";

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

function _getAggregationSelectExpression(
  options: Readonly<{
    aggregationType: QueryAggregationType.DuckDbQueryAggregationType;
    columnName: string;
  }>,
): Knex.Raw {
  const aggregationColumnName =
    DuckDbQueryAggregations.getAggregationColumnName(
      options.aggregationType,
      options.columnName,
    );
  const quotedColumnName = quoteSqlIdentifier(options.columnName);
  const quotedAggregationColumnName = quoteSqlIdentifier(aggregationColumnName);
  const functionName = match(options.aggregationType)
    .with("sum", () => {
      return "sum";
    })
    .with("avg", () => {
      return "avg";
    })
    .with("count", () => {
      return "count";
    })
    .with("max", () => {
      return "max";
    })
    .with("min", () => {
      return "min";
    })
    .exhaustive();
  return sql.raw(
    `${functionName}(${quotedColumnName}) as ${quotedAggregationColumnName}`,
  );
}

function _getStructuredSelectFields(
  input: Readonly<{
    structuredQuery: DuckDbStructuredQuery;
    tableColumns: DuckDbColumnSchema[];
  }>,
): Knex.Raw[] {
  const { structuredQuery, tableColumns } = input;
  const { aggregations = {}, selectColumnNames = "*" } = structuredQuery;
  const timestampColumnNames = new Set(
    tableColumns
      .filter((column) => {
        return DuckDbDataTypeUtils.isDateOrTimestamp(column.column_type);
      })
      .map(prop("column_name")),
  );
  const columnNames =
    selectColumnNames === "*"
      ? tableColumns.map(prop("column_name"))
      : selectColumnNames;
  const columnNamesWithoutAggregations = columnNames.filter((colName) => {
    return aggregations[colName] === undefined;
  });
  return columnNamesWithoutAggregations.map((columnName) => {
    const quotedColumnName = quoteSqlIdentifier(columnName);
    if (
      structuredQuery.castTimestampsToISO &&
      timestampColumnNames.has(columnName)
    ) {
      return sql.raw(
        `strftime(${quotedColumnName}::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%fZ') as ${quotedColumnName}`,
      );
    }
    return sql.raw(quotedColumnName);
  });
}

function _buildStructuredQuery(
  input: Readonly<{
    selectFields: Knex.Raw[];
    structuredQuery: DuckDbStructuredQuery;
  }>,
): Knex.QueryBuilder {
  const { selectFields, structuredQuery } = input;
  const { aggregations = {}, groupByColumnNames = [] } = structuredQuery;
  let query = sql.select(...selectFields).from(structuredQuery.tableName);
  if (groupByColumnNames.length > 0) {
    query = query.groupByRaw(
      groupByColumnNames.map(quoteSqlIdentifier).join(", "),
    );
  }
  if (structuredQuery.orderByColumnName && structuredQuery.orderByDirection) {
    query = query.orderByRaw(
      `${quoteSqlIdentifier(structuredQuery.orderByColumnName)} ${structuredQuery.orderByDirection}`,
    );
  }
  query = objectEntries(aggregations).reduce(
    (currentQuery, [columnName, aggregationType]) => {
      return currentQuery.select(
        _getAggregationSelectExpression({ columnName, aggregationType }),
      );
    },
    query,
  );
  if (structuredQuery.limit) {
    query = query.limit(structuredQuery.limit);
  }
  if (structuredQuery.offset) {
    query = query.offset(structuredQuery.offset);
  }
  return query;
}

async function _executeStructuredQuery<RowObject extends UnknownRow>(
  input: Readonly<{
    client: DuckDbClientOperations;
    conn: Awaited<ReturnType<DuckDbClientOperations["connect"]>>;
    query: Knex.QueryBuilder;
  }>,
): Promise<QueryResult.T<RowObject>> {
  try {
    const queryString = input.query.toString();
    const arrowTable =
      await input.conn.query<Record<string, arrow.DataType>>(queryString);
    return arrowTableToJS<RowObject>(arrowTable, {
      logger: input.client.logger,
    });
  } catch (error) {
    input.client.logger.error(error, { query: input.query.toString() });
    throw error;
  }
}

/** Runs a structured query on a fresh connection under an existing lease. */
export async function runLeasedDuckDbStructuredQuery<
  RowObject extends UnknownRow,
>(
  options: Readonly<{
    client: DuckDbClientOperations;
    datasetDuckDbLease: DatasetDuckDbLease;
    structuredQuery: DuckDbStructuredQuery;
  }>,
): Promise<QueryResult.T<RowObject>> {
  const { client } = options;
  const conn = await client.connect();
  try {
    const tableColumns = await client.getTableSchema({
      tableName: options.structuredQuery.tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    const selectFields = _getStructuredSelectFields({
      structuredQuery: options.structuredQuery,
      tableColumns,
    });
    const query = _buildStructuredQuery({
      selectFields,
      structuredQuery: options.structuredQuery,
    });
    return await _executeStructuredQuery<RowObject>({ client, conn, query });
  } finally {
    await client.closeConnection(conn);
  }
}
