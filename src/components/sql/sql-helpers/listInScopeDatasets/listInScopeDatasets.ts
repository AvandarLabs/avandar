import type { SqlScope } from "@/components/sql/sql-helpers/computeSqlScope/computeSqlScope";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

/**
 * Convenience: filter a list of catalog datasets to those that share at least
 * one in-scope dataset id. Used to build the dataset-pill dropdown.
 */
export function listInScopeDatasets(
  scope: SqlScope,
  catalog: SqlDisplayCatalog,
): ReadonlyArray<SqlDisplayCatalog["datasets"][number]> {
  return catalog.datasets.filter((d) => {
    return scope.datasetIds.has(d.id);
  });
}
