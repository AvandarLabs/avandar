import {
  makeIdLookupMap,
  objectValues,
  prop,
  sortObjList,
  valNotEq,
} from "@avandar/utils";
import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { applyFilters } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyFilters.ts";
import { applyHaving } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyHaving/applyHaving.ts";
import { applyJoins } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyJoins.ts";
import { makeFilterColumnFromStructuredQuery } from "$/models/queries/StructuredQuery/structuredQueryToSql/makeFilterColumnFromStructuredQuery.ts";
import { makeSqlExpressionFromQueryColumn } from "$/models/queries/StructuredQuery/structuredQueryToSql/makeSqlExpressionFromQueryColumn.ts";
import { sqlBuilder } from "$/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts";
import { makeRelationRefFromQueryDataSource } from "$/models/relations/RelationRef/makeRelationRefFromQueryDataSource.ts";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";
import type { StructuredQueryToSqlOptions } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.types.ts";
import type { Knex } from "knex";

export type { StructuredQueryToSqlOptions } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.types.ts";

/** Gets the emitted output name using the authoritative aggregation map. */
function _getOrderByColumnName(
  column: QueryColumn.T,
  aggregations: PartialStructuredQuery["aggregations"],
): string {
  return QueryColumn.getDerivedColumnName({
    ...column,
    aggregation: aggregations[column.id],
  });
}

/** Emits SQL from selected projections and source/projection filter IDs. */
export function structuredQueryToSql(
  query: PartialStructuredQuery,
  {
    castTimestampsToISO = false,
    columnTypes,
  }: StructuredQueryToSqlOptions = {},
): string {
  if (query.dataSource === undefined && query.nestedSubquery === undefined) {
    return "";
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
  // A dataset's table name is still its bare id, so stored SQL and bookmarked
  // `?sql=` URLs are unaffected; a concept resolves to its `concept_` prefixed
  // view. `RelationRef` owns both spellings, so this emitter never builds a
  // table name itself.
  const tableName =
    nestedSubquery || dataSource === undefined
      ? undefined
      : RelationRef.toTableName(makeRelationRefFromQueryDataSource(dataSource));

  const groupByColumnNames = [] as string[];
  const atLeastOneColumnHasAggregation = objectValues(aggregations).some(
    valNotEq("none"),
  );

  sortedQueryColumns.forEach((column) => {
    const aggregation = aggregations[column.id];
    if (
      (aggregation === undefined ||
        aggregation === "none" ||
        aggregation === "group_by") &&
      atLeastOneColumnHasAggregation
    ) {
      groupByColumnNames.push(column.baseColumn.name);
    }
  });

  const orderByColumnName =
    orderByColumn && queryColumnLookup.has(orderByColumn)
      ? _getOrderByColumnName(
          queryColumnLookup.get(orderByColumn)!,
          aggregations,
        )
      : undefined;

  const adjustedColumnNames = sortedQueryColumns.map((column) => {
    const aggregation = aggregations[column.id];
    const expression = makeSqlExpressionFromQueryColumn({
      column: column,
      aggregation: aggregation,
    });
    const isPlain =
      aggregation === undefined ||
      aggregation === "none" ||
      aggregation === "group_by";
    const selection =
      castTimestampsToISO &&
      isPlain &&
      AvaDataType.isDateOrTimestamp(column.baseColumn.dataType)
        ? `strftime(${expression}::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%fZ')`
        : expression;
    const outputName = QueryColumn.getDerivedColumnName({
      ...column,
      aggregation,
    });
    return sqlBuilder.raw(`${selection} as ${quoteSqlIdentifier(outputName)}`);
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
    sqlQuery = applyFilters(sqlQuery, filters, {
      columnTypes,
      getColumn: (columnId) => {
        return makeFilterColumnFromStructuredQuery({
          columnId,
          clause: "where",
          query,
        });
      },
    });
  }

  if (groupByColumnNames.length > 0) {
    const groupByClause = groupByColumnNames.map(quoteSqlIdentifier).join(", ");
    sqlQuery = sqlQuery.groupByRaw(groupByClause);
  }

  // apply HAVING clause (after GROUP BY, before ORDER BY)
  if (!isEmptyQueryFilter(having)) {
    sqlQuery = applyHaving(sqlQuery, having, {
      columnTypes,
      getColumn: (columnId) => {
        return makeFilterColumnFromStructuredQuery({
          columnId,
          clause: "having",
          query,
        });
      },
    });
  }

  if (orderByColumnName && orderByDirection) {
    const quotedOrderByColumn = quoteSqlIdentifier(orderByColumnName);
    sqlQuery = sqlQuery.orderByRaw(
      `${quotedOrderByColumn} ${orderByDirection}`,
    );
  }

  if (limit) {
    sqlQuery = sqlQuery.limit(limit);
  }
  if (offset) {
    sqlQuery = sqlQuery.offset(offset);
  }

  return sqlQuery.toString();
}
