import { propEq } from "@avandar/utils";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import { makeSqlExpressionFromQueryColumn } from "$/models/queries/StructuredQuery/structuredQueryToSql/makeSqlExpressionFromQueryColumn.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/**
 * Gets the SQL expression and data type a filter on a column ID compares
 * against: a source column for WHERE, or an aggregated projection for
 * HAVING. Undefined when the ID matches no column or several, or when a
 * HAVING column's aggregation is unset or `none`.
 *
 * Use it wherever a filter rule is rendered as SQL, for example as the
 * column lookup when emitting a WHERE or HAVING clause.
 */
export function makeFilterColumnFromStructuredQuery(
  options: Readonly<{
    columnId: QueryColumn.Id;
    clause: "where" | "having";
    query: StructuredQuery.Partial;
  }>,
): { sql: string; dataType: AvaDataType.T } | undefined {
  const { columnId, clause, query } = options;
  const columns = clause === "where" ? query.sourceColumns : query.queryColumns;
  const matches = columns?.filter(propEq("id", columnId)) ?? [];
  const column = matches.length === 1 ? matches[0] : undefined;
  if (!column) {
    return undefined;
  }
  const aggregation =
    clause === "having" ? query.aggregations[column.id] : undefined;
  if (
    clause === "having" &&
    (aggregation === undefined || aggregation === "none")
  ) {
    return undefined;
  }
  return {
    sql: makeSqlExpressionFromQueryColumn({
      column: column,
      aggregation: aggregation,
    }),
    dataType: QueryAggregationType.getQueryResultDataType({
      aggregation: aggregation,
      sourceDataType: column.baseColumn.dataType,
    }),
  };
}
