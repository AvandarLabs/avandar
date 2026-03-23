import { Model } from "@models/Model/Model.ts";
import { valNotEq } from "@utils/guards/hofs/valNotEq.ts";
import { makeIdLookupMap } from "@utils/maps/makeIdLookupMap/makeIdLookupMap.ts";
import { prop } from "@utils/objects/hofs/prop/prop.ts";
import { objectEntries } from "@utils/objects/objectEntries.ts";
import { objectValues } from "@utils/objects/objectValues.ts";
import { sortObjList } from "@utils/objects/sortObjList/sortObjList.ts";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes.ts";
import { DuckDBQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationTypes.ts";
import { QueryColumns } from "$/models/queries/QueryColumn/QueryColumns.ts";
import knex from "knex";
import { match } from "ts-pattern";
import type { PartialStructuredQuery } from "../StructuredQuery.types.ts";
import type { DuckDBQueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationTypes.ts";

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

function _quoteSQLIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function toRawDuckDBQuery(
  query: PartialStructuredQuery,
  {
    castTimestampsToISO = false,
  }: {
    castTimestampsToISO?: boolean;
  } = {},
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

  const duckDBAggregations = {} as Record<
    string, // duckdb uses column **names** for aggregations (not ids)
    DuckDBQueryAggregationType
  >;
  objectEntries(aggregations).forEach(([columnId, aggregation]) => {
    const column = queryColumnLookup.get(columnId);

    // We only handle DatasetColumns here. We are not handling
    // EntityFieldConfigs here.
    if (Model.isOfModelType(column?.baseColumn, "DatasetColumn")) {
      // "group_by" and "none" are not valid DucKDB aggregations, so
      // we exclude them here.
      if (aggregation !== "group_by" && aggregation !== "none") {
        duckDBAggregations[column.baseColumn.name] = aggregation;
      } else {
        // But if the aggregation is "group_by" or there is at least
        // one other column with an aggregation, then we add this
        // column to the groupBy list to make sure our SQL query
        // remains valid.
        if (atLeastOneColumnHasAggregation || aggregation === "group_by") {
          groupByColumnNames.push(column.baseColumn.name);
        }
      }
    }
  });

  const selectColumnNames = sortedQueryColumns.map(prop("baseColumn.name"));
  const orderByColumnName =
    orderByColumn && queryColumnLookup.has(orderByColumn) ?
      QueryColumns.getDerivedColumnName(queryColumnLookup.get(orderByColumn)!)
    : undefined;

  const timestampColumnNames = queryColumns
    .filter((column) => {
      return AvaDataTypes.isDateOrTimestamp(column.baseColumn.dataType);
    })
    .map(prop("baseColumn.name"));

  const columnNamesWithoutAggregations = selectColumnNames.filter((colName) => {
    return duckDBAggregations[colName] === undefined;
  });

  // if requested, cast any timestamp columns that will go in the SELECT
  // clause to ISO strings
  const adjustedColumnNames = columnNamesWithoutAggregations.map((colName) => {
    const quotedColName = _quoteSQLIdentifier(colName);
    if (castTimestampsToISO) {
      return timestampColumnNames.includes(colName) ?
          sql.raw(
            `strftime(${quotedColName}::TIMESTAMP, "'%Y-%m-%dT%H:%M:%S.%fZ') as ${quotedColName}`,
          )
        : sql.raw(quotedColName);
    }
    return sql.raw(quotedColName);
  });

  // now start putting the final query object together
  let sqlQuery = sql.select(...adjustedColumnNames).from(tableName);

  // add group bys
  if (groupByColumnNames.length > 0) {
    const groupByClause = groupByColumnNames
      .map(_quoteSQLIdentifier)
      .join(", ");
    sqlQuery = sqlQuery.groupByRaw(groupByClause);
  }

  // add ordering
  if (orderByColumnName && orderByDirection) {
    const quotedOrderByColumn = _quoteSQLIdentifier(orderByColumnName);
    sqlQuery = sqlQuery.orderByRaw(
      `${quotedOrderByColumn} ${orderByDirection}`,
    );
  }

  // apply aggregations
  sqlQuery = objectEntries(duckDBAggregations).reduce(
    (newQuery, [columnName, aggType]) => {
      const aggregationColumnName =
        DuckDBQueryAggregations.getAggregationColumnName(aggType, columnName);
      const quotedColumnName = _quoteSQLIdentifier(columnName);
      const quotedAggregationColumnName = _quoteSQLIdentifier(
        aggregationColumnName,
      );

      return match(aggType)
        .with("sum", () => {
          return newQuery.select(
            sql.raw(
              `sum(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("avg", () => {
          return newQuery.select(
            sql.raw(
              `avg(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("count", () => {
          return newQuery.select(
            sql.raw(
              `count(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("max", () => {
          return newQuery.select(
            sql.raw(
              `max(${quotedColumnName}) as ${quotedAggregationColumnName}`,
            ),
          );
        })
        .with("min", () => {
          return newQuery.select(
            sql.raw(
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

  // add limits and offsets
  if (limit) {
    sqlQuery = sqlQuery.limit(limit);
  }
  if (offset) {
    sqlQuery = sqlQuery.offset(offset);
  }

  return sqlQuery.toString();
}
