import { buildProjectionExpression } from "$/models/queries/StructuredQuery/structuredQueryToSql/buildProjectionExpression/buildProjectionExpression.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/** Gets the model-derived expression and effective type for a filter target. */
export function resolveFilterColumn(
  options: Readonly<{
    columnId: QueryColumn.Id;
    clause: "where" | "having";
    query: StructuredQuery.Partial;
  }>,
): { sql: string; dataType: AvaDataType.T } | undefined {
  const { columnId, clause, query } = options;
  const columns = clause === "where" ? query.sourceColumns : query.queryColumns;
  const matches =
    columns?.filter((column) => {
      return column.id === columnId;
    }) ?? [];
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
    sql: buildProjectionExpression(column, aggregation),
    dataType:
      aggregation === "count"
        ? "bigint"
        : aggregation === "avg"
          ? "double"
          : column.baseColumn.dataType,
  };
}
