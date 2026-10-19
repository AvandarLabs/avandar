import { propEq } from "@avandar/utils";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import { makeSqlExpressionFromQueryColumn } from "$/models/queries/StructuredQuery/structuredQueryToSql/makeSqlExpressionFromQueryColumn.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/** Gets the model-derived expression and effective type for a filter target. */
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
    dataType: QueryAggregationType.getResultDataType({
      aggregation: aggregation,
      sourceDataType: column.baseColumn.dataType,
    }),
  };
}
