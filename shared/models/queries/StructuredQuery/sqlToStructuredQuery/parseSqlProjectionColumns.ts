import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import {
  columnRefName,
  identifierToString,
  matchAggregation,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types.ts";
import type { SqlMappingInput } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery.types.ts";

type Options = {
  columnsList: unknown;
  groupBy: unknown;
  dataset: SqlMappingInput["datasets"][number] | undefined;
  skipColumnHydration: boolean;
};
function _matchColumn(
  columnName: string,
  columns: readonly DatasetColumnRead[],
): DatasetColumnRead | undefined {
  return columns.find((c) => {
    return c.name === columnName || c.originalName === columnName;
  });
}

function _makeQueryColumn(
  baseColumn: DatasetColumnRead,
  aggregation: QueryAggregationTypeT | undefined,
  outputAlias?: string,
): QueryColumnRead {
  return Model.make("QueryColumn", {
    id: uuid<QueryColumnId>(),
    baseColumn,
    aggregation,
    outputAlias,
  });
}

/** Maps SELECT expressions and GROUP BY references to query columns. */
export function parseSqlProjectionColumns({
  columnsList,
  groupBy,
  dataset,
  skipColumnHydration,
}: Readonly<Options>): {
  queryColumns: QueryColumnRead[];
  aggregations: Record<QueryColumnId, QueryAggregationTypeT>;
  unmappedReasons: SqlFailedMappingReason[];
} {
  const unmappedReasons: SqlFailedMappingReason[] = [];
  // Walk select columns. When the FROM is a nested subquery or has joins
  // we can't always tie columns back to a known dataset; in those cases we
  // skip column hydration and rely on the raw SQL still being the source
  // of truth.
  const queryColumns: QueryColumnRead[] = [];
  const aggregations: Record<QueryColumnId, QueryAggregationTypeT> = {};
  if (Array.isArray(columnsList) && !skipColumnHydration && dataset) {
    columnsList.forEach((item) => {
      const expr = (item as { expr?: unknown }).expr;
      const outputAlias = identifierToString((item as { as?: unknown }).as);
      if (!expr || typeof expr !== "object") {
        unmappedReasons.push({ code: "selectItemUnrecognised" });
        return;
      }
      const exprObj = expr as Record<string, unknown>;
      const exprType = exprObj.type;

      // Star "*": expand all columns. node-sql-parser represents `*` as a
      // column_ref whose `column` is the literal string "*", or as a
      // separate `star` node depending on dialect.
      if (
        exprType === "star" ||
        (exprType === "column_ref" && exprObj.column === "*")
      ) {
        dataset.columns.forEach((col) => {
          queryColumns.push(_makeQueryColumn(col, undefined));
        });
        return;
      }

      // Plain column reference
      if (exprType === "column_ref") {
        const columnName = identifierToString(exprObj.column);
        if (!columnName) {
          unmappedReasons.push({ code: "selectUnnamedExpression" });
          return;
        }
        const matched = _matchColumn(columnName, dataset.columns);
        if (!matched) {
          unmappedReasons.push({ code: "selectUnknownColumn", columnName });
          return;
        }
        queryColumns.push(_makeQueryColumn(matched, undefined, outputAlias));
        return;
      }

      // Aggregate function: SUM(col), AVG(col), COUNT(col), MAX(col), MIN(col)
      if (exprType === "aggr_func") {
        const funcName = String(exprObj.name ?? "");
        const agg = matchAggregation(funcName);
        const args = exprObj.args as { expr?: unknown } | undefined;
        const inner = args?.expr;
        const colName = columnRefName(inner);
        if (!agg) {
          unmappedReasons.push({
            code: "selectUnsupportedAggregate",
            funcName,
          });
          return;
        }
        if (!colName) {
          unmappedReasons.push({ code: "aggregateComplexArgument", funcName });
          return;
        }
        const matched = _matchColumn(colName, dataset.columns);
        if (!matched) {
          unmappedReasons.push({
            code: "aggregateUnknownColumn",
            columnName: colName,
          });
          return;
        }
        const queryColumn = _makeQueryColumn(matched, agg, outputAlias);
        queryColumns.push(queryColumn);
        aggregations[queryColumn.id] = agg;
        return;
      }

      unmappedReasons.push({
        code: "selectUnsupportedExpression",
        exprType: String(exprType),
      });
    });
  }

  // Ensure aggregations map covers all columns
  queryColumns.forEach((col) => {
    if (aggregations[col.id] === undefined) {
      aggregations[col.id] = "none";
    }
  });

  // GROUP BY → mark referenced columns as "group_by" if not already aggregated
  const groupby = groupBy as { columns?: unknown } | null;
  const groupbyColumns = groupby?.columns;
  if (Array.isArray(groupbyColumns)) {
    groupbyColumns.forEach((node) => {
      const colName = columnRefName(node);
      if (!colName) {
        unmappedReasons.push({ code: "groupByNonColumn" });
        return;
      }
      const match = queryColumns.find(propEq("baseColumn.name", colName));
      if (match) {
        if (aggregations[match.id] === "none") {
          aggregations[match.id] = "group_by";
        }
      }
    });
  }

  return { queryColumns, aggregations, unmappedReasons };
}
