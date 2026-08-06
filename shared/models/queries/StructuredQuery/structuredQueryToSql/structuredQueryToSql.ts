/**
 * Convert a {@link PartialStructuredQuery} into a raw SQL string using knex.
 *
 * This is the canonical "structured query to SQL" path. The Data Explorer
 * calls it whenever the manual query form changes so that the textual SQL
 * stays in sync with the form.
 *
 * Extracted from {@link toRawDuckDBQuery} so it can be reused outside the
 * DuckDB-specific code path and so callers can override identifier quoting
 * or knex options independently.
 */
import { Model } from "@models/Model/Model.ts";
import { valNotEq } from "@utils/guards/hofs/valNotEq.ts";
import { makeIdLookupMap } from "@utils/maps/makeIdLookupMap/makeIdLookupMap.ts";
import { prop } from "@utils/objects/hofs/prop/prop.ts";
import { objectEntries } from "@utils/objects/objectEntries.ts";
import { objectValues } from "@utils/objects/objectValues.ts";
import { sortObjList } from "@utils/objects/sortObjList/sortObjList.ts";
import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DuckDbQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { applyFilters } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts";
import { applyHaving } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyHaving.ts";
import { applyJoins } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyJoins.ts";
import { sqlBuilder } from "$/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts";
import { match } from "ts-pattern";
import type { DuckDbQueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { StructuredQueryToSqlOptions } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.types.ts";
import type { Knex } from "knex";

export type { StructuredQueryToSqlOptions } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.types.ts";

export function structuredQueryToSql(
  query: PartialStructuredQuery,
  { castTimestampsToISO = false }: StructuredQueryToSqlOptions = {},
): string {
  if (query.dataSource === undefined && query.nestedSubquery === undefined) {
    return "";
  }

  if (
    query.dataSource !== undefined &&
    Model.isOfModelType(query.dataSource, "EntityConfig")
  ) {
    throw new Error("Querying EntityConfigs through DuckDB is not supported.");
  }

  const {
    queryColumns,
    dataSource,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
    having,
    joins,
    nestedSubquery,
    limit,
    offset,
  } = query;

  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const queryColumnLookup = makeIdLookupMap(sortedQueryColumns, {
    key: "id",
  });
  const tableName = nestedSubquery ? undefined : dataSource?.id;

  const groupByColumnNames = [] as string[];
  const atLeastOneColumnHasAggregation = objectValues(aggregations).some(
    valNotEq("none"),
  );

  const duckDBAggregations = {} as Record<string, DuckDbQueryAggregationTypeT>;
  objectEntries(aggregations).forEach(([columnId, aggregation]) => {
    const column = queryColumnLookup.get(columnId);

    if (Model.isOfModelType(column?.baseColumn, "DatasetColumn")) {
      if (aggregation !== "group_by" && aggregation !== "none") {
        duckDBAggregations[column.baseColumn.name] = aggregation;
      } else {
        if (atLeastOneColumnHasAggregation || aggregation === "group_by") {
          groupByColumnNames.push(column.baseColumn.name);
        }
      }
    }
  });

  const selectColumnNames = sortedQueryColumns.map(prop("baseColumn.name"));
  const orderByColumnName =
    orderByColumn && queryColumnLookup.has(orderByColumn) ?
      QueryColumn.getDerivedColumnName(queryColumnLookup.get(orderByColumn)!)
    : undefined;

  const timestampColumnNames = queryColumns
    .filter((column) => {
      return AvaDataType.isDateOrTimestamp(column.baseColumn.dataType);
    })
    .map(prop("baseColumn.name"));

  const columnNamesWithoutAggregations = selectColumnNames.filter((colName) => {
    return duckDBAggregations[colName] === undefined;
  });

  const adjustedColumnNames = columnNamesWithoutAggregations.map((colName) => {
    const quotedColName = quoteSqlIdentifier(colName);
    if (castTimestampsToISO) {
      return timestampColumnNames.includes(colName) ?
          sqlBuilder.raw(
            `strftime(${quotedColName}::TIMESTAMP, "'%Y-%m-%dT%H:%M:%S.%fZ') as ${quotedColName}`,
          )
        : sqlBuilder.raw(quotedColName);
    }
    return sqlBuilder.raw(quotedColName);
  });

  let sqlQuery: Knex.QueryBuilder;
  if (nestedSubquery) {
    const alias = nestedSubquery.alias ?? "subq";
    const quotedAlias = quoteSqlIdentifier(alias);
    sqlQuery = sqlBuilder
      .select(...adjustedColumnNames)
      .fromRaw(`(${nestedSubquery.sql}) as ${quotedAlias}`);
  } else if (tableName) {
    sqlQuery = sqlBuilder.select(...adjustedColumnNames).from(tableName);
  } else {
    return "";
  }

  // apply joins (must be before WHERE for correctness)
  if (joins.length > 0) {
    sqlQuery = applyJoins(sqlQuery, joins);
  }

  // apply filters (WHERE clause)
  if (filters && !isEmptyQueryFilter(filters)) {
    sqlQuery = applyFilters(sqlQuery, filters);
  }

  if (groupByColumnNames.length > 0) {
    const groupByClause = groupByColumnNames.map(quoteSqlIdentifier).join(", ");
    sqlQuery = sqlQuery.groupByRaw(groupByClause);
  }

  // apply HAVING clause (after GROUP BY, before ORDER BY)
  if (!isEmptyQueryFilter(having)) {
    sqlQuery = applyHaving(sqlQuery, having);
  }

  if (orderByColumnName && orderByDirection) {
    const quotedOrderByColumn = quoteSqlIdentifier(orderByColumnName);
    sqlQuery = sqlQuery.orderByRaw(
      `${quotedOrderByColumn} ${orderByDirection}`,
    );
  }

  sqlQuery = objectEntries(duckDBAggregations).reduce(
    (newQuery, [columnName, aggType]) => {
      const aggregationColumnName =
        DuckDbQueryAggregations.getAggregationColumnName(aggType, columnName);
      const quotedColumnName = quoteSqlIdentifier(columnName);
      const quotedAggregationColumnName = quoteSqlIdentifier(
        aggregationColumnName,
      );

      return match(aggType)
        .with("sum", () => {
          return newQuery.select(
            sqlBuilder.raw(
              `sum(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("avg", () => {
          return newQuery.select(
            sqlBuilder.raw(
              `avg(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("count", () => {
          return newQuery.select(
            sqlBuilder.raw(
              `count(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("max", () => {
          return newQuery.select(
            sqlBuilder.raw(
              `max(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("min", () => {
          return newQuery.select(
            sqlBuilder.raw(
              `min(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .exhaustive(() => {
          throw new Error(`Invalid DuckDBQueryAggregationType: "${aggType}"`);
        });
    },
    sqlQuery,
  );

  if (limit) {
    sqlQuery = sqlQuery.limit(limit);
  }
  if (offset) {
    sqlQuery = sqlQuery.offset(offset);
  }

  return sqlQuery.toString();
}
