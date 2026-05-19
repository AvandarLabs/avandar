/**
 * Convert a {@link PartialStructuredQuery} into a raw SQL string using knex.
 *
 * This is the canonical "structured query → SQL" path. The Data Explorer
 * calls it whenever the manual query form changes so that the textual SQL
 * stays in sync with the form (Phase 2 bidirectional sync).
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
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DuckDbQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationTypeModule.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import knex from "knex";
import { match } from "ts-pattern";
import type { Knex } from "knex";
import type { DuckDbQueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryFilter,
  QueryFilterGroup,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

export type StructuredQueryToSQLOptions = {
  /**
   * When true, timestamp columns are cast to ISO-formatted strings in the
   * SELECT clause. DuckDB-specific; off by default.
   */
  castTimestampsToISO?: boolean;
};

const _sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

function _quoteSQLIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Apply a single rule node to a knex query builder.
 */
function _applyFilterRule(
  builder: Knex.QueryBuilder,
  rule: QueryFilterRule,
): Knex.QueryBuilder {
  const column = rule.columnName;
  return match(rule.operator)
    .with("=", () => {
      return builder.where(column, "=", rule.value as Knex.Value);
    })
    .with("!=", () => {
      return builder.where(column, "!=", rule.value as Knex.Value);
    })
    .with(">", () => {
      return builder.where(column, ">", rule.value as Knex.Value);
    })
    .with(">=", () => {
      return builder.where(column, ">=", rule.value as Knex.Value);
    })
    .with("<", () => {
      return builder.where(column, "<", rule.value as Knex.Value);
    })
    .with("<=", () => {
      return builder.where(column, "<=", rule.value as Knex.Value);
    })
    .with("like", () => {
      return builder.where(column, "like", String(rule.value ?? ""));
    })
    .with("not_like", () => {
      return builder.where(column, "not like", String(rule.value ?? ""));
    })
    .with("in", () => {
      const items =
        Array.isArray(rule.value) ?
          (rule.value as ReadonlyArray<string | number>)
        : String(rule.value ?? "")
            .split(",")
            .map((s) => {
              return s.trim();
            })
            .filter(Boolean);
      return builder.whereIn(column, items as Knex.Value[]);
    })
    .with("not_in", () => {
      const items =
        Array.isArray(rule.value) ?
          (rule.value as ReadonlyArray<string | number>)
        : String(rule.value ?? "")
            .split(",")
            .map((s) => {
              return s.trim();
            })
            .filter(Boolean);
      return builder.whereNotIn(column, items as Knex.Value[]);
    })
    .with("is_null", () => {
      return builder.whereNull(column);
    })
    .with("is_not_null", () => {
      return builder.whereNotNull(column);
    })
    .with("between", () => {
      const items =
        Array.isArray(rule.value) ?
          (rule.value as ReadonlyArray<string | number>)
        : String(rule.value ?? "")
            .split(",")
            .map((s) => {
              return s.trim();
            });
      const start = items[0];
      const end = items[1];
      if (start === undefined || end === undefined) {
        return builder;
      }
      return builder.whereBetween(column, [
        start as Knex.Value,
        end as Knex.Value,
      ]);
    })
    .exhaustive(() => {
      throw new Error(`Unknown filter operator on rule for "${column}".`);
    });
}

/**
 * Apply a filter node (group or rule) to a knex query builder, preserving
 * AND/OR semantics for nested groups.
 */
function _applyFilterNode(
  builder: Knex.QueryBuilder,
  node: QueryFilter,
  combinator: "AND" | "OR",
): Knex.QueryBuilder {
  if (node.type === "rule") {
    if (combinator === "OR") {
      return builder.orWhere((sub) => {
        _applyFilterRule(sub as Knex.QueryBuilder, node);
      });
    }
    return _applyFilterRule(builder, node);
  }

  if (node.rules.length === 0) {
    return builder;
  }

  const subFn = (sub: unknown): void => {
    let current = sub as Knex.QueryBuilder;
    node.rules.forEach((child) => {
      current = _applyFilterNode(current, child, node.combinator);
    });
  };

  if (combinator === "OR") {
    return builder.orWhere(subFn);
  }
  return builder.andWhere(subFn);
}

function _applyFilters(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
): Knex.QueryBuilder {
  if (isEmptyQueryFilter(group)) {
    return builder;
  }
  let current = builder;
  group.rules.forEach((child) => {
    current = _applyFilterNode(current, child, group.combinator);
  });
  return current;
}

export function structuredQueryToSQL(
  query: PartialStructuredQuery,
  { castTimestampsToISO = false }: StructuredQueryToSQLOptions = {},
): string {
  if (query.dataSource === undefined) {
    return "";
  }

  if (Model.isOfModelType(query.dataSource, "EntityConfig")) {
    throw new Error("Querying EntityConfigs through DuckDB is not supported.");
  }

  const {
    queryColumns,
    dataSource,
    aggregations,
    orderByColumn,
    orderByDirection,
    filters,
    limit,
    offset,
  } = query;

  const sortedQueryColumns = sortObjList(queryColumns, {
    sortBy: prop("id"),
  });
  const queryColumnLookup = makeIdLookupMap(sortedQueryColumns, {
    key: "id",
  });
  const tableName = dataSource.id;

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
    const quotedColName = _quoteSQLIdentifier(colName);
    if (castTimestampsToISO) {
      return timestampColumnNames.includes(colName) ?
          _sql.raw(
            `strftime(${quotedColName}::TIMESTAMP, "'%Y-%m-%dT%H:%M:%S.%fZ') as ${quotedColName}`,
          )
        : _sql.raw(quotedColName);
    }
    return _sql.raw(quotedColName);
  });

  let sqlQuery = _sql.select(...adjustedColumnNames).from(tableName);

  // apply filters (WHERE clause)
  if (filters && !isEmptyQueryFilter(filters)) {
    sqlQuery = _applyFilters(sqlQuery, filters);
  }

  if (groupByColumnNames.length > 0) {
    const groupByClause = groupByColumnNames
      .map(_quoteSQLIdentifier)
      .join(", ");
    sqlQuery = sqlQuery.groupByRaw(groupByClause);
  }

  if (orderByColumnName && orderByDirection) {
    const quotedOrderByColumn = _quoteSQLIdentifier(orderByColumnName);
    sqlQuery = sqlQuery.orderByRaw(
      `${quotedOrderByColumn} ${orderByDirection}`,
    );
  }

  sqlQuery = objectEntries(duckDBAggregations).reduce(
    (newQuery, [columnName, aggType]) => {
      const aggregationColumnName =
        DuckDbQueryAggregations.getAggregationColumnName(aggType, columnName);
      const quotedColumnName = _quoteSQLIdentifier(columnName);
      const quotedAggregationColumnName = _quoteSQLIdentifier(
        aggregationColumnName,
      );

      return match(aggType)
        .with("sum", () => {
          return newQuery.select(
            _sql.raw(
              `sum(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("avg", () => {
          return newQuery.select(
            _sql.raw(
              `avg(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("count", () => {
          return newQuery.select(
            _sql.raw(
              `count(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("max", () => {
          return newQuery.select(
            _sql.raw(
              `max(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("min", () => {
          return newQuery.select(
            _sql.raw(
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
