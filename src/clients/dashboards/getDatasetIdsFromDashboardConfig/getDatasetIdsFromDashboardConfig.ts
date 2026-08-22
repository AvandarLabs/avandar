import { isPlainObject, isString, traverse } from "@avandar/utils";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _toTrimmedString(value: unknown): string {
  return isString(value) ? value.trim() : "";
}

function _getDataVizSqlStrings(dashboardConfig: unknown): string[] {
  const sqlStrings: string[] = [];
  traverse(dashboardConfig, (node) => {
    if (!isPlainObject(node)) {
      return;
    }
    const props: unknown = node["props"];
    if (node["type"] !== "DataViz" || !isPlainObject(props)) {
      return;
    }
    const nlQuery: unknown = props["nlQuery"];
    if (!isPlainObject(nlQuery)) {
      return;
    }
    const sql = _toTrimmedString(nlQuery["rawSql"]);
    if (sql.length > 0) {
      sqlStrings.push(sql);
    }
  });
  return sqlStrings;
}

/**
 * Gets dataset ID candidates referenced by DataViz SQL in a dashboard.
 *
 * Candidates remain unresolved until the publisher checks them against the
 * eligible workspace datasets. Dangling UUID references must not disappear
 * from the snapshot dependency check.
 */
export function getDatasetIdsFromDashboardConfig(
  dashboardConfig: unknown,
): Array<Dataset.Id | string> {
  return Array.from(
    new Set(
      _getDataVizSqlStrings(dashboardConfig).flatMap(
        DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences,
      ),
    ),
  );
}
