import { isPlainObject, isString, traverse } from "@avandar/utils";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _toTrimmedString(value: unknown): string {
  return isString(value) ? value.trim() : "";
}

function _extractDataVizSqlStrings(dashboardConfig: unknown): string[] {
  const sqlStrings: string[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node)) {
      return;
    }
    const props: unknown = node["props"];
    if (node["type"] !== "DataViz" || !isPlainObject(props)) {
      return;
    }
    const dataVizProps = props as {
      nlQuery: { rawSql: unknown; prompt: unknown };
    };
    const sql = _toTrimmedString(dataVizProps.nlQuery.rawSql);
    if (sql.length > 0) {
      sqlStrings.push(sql);
    }
  });
  return sqlStrings;
}

/**
 * Extracts dataset ID candidates referenced by DataViz SQL in a dashboard.
 *
 * Candidates remain unresolved until the publisher checks them against the
 * eligible workspace datasets. Dangling UUID references must not disappear
 * from the snapshot dependency check.
 */
export function extractDatasetIdsFromDashboardConfig(
  dashboardConfig: unknown,
): Array<Dataset.Id | string> {
  return Array.from(
    new Set(
      _extractDataVizSqlStrings(dashboardConfig).flatMap(
        DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences,
      ),
    ),
  );
}
