/**
 * Helpers for reasoning about which datasets and columns are in scope inside
 * a SQL string. Used by {@link AvaSqlBlock} (and the SQL pill UI in
 * `createSqlDisplayExtension`) to mark out-of-scope column references as
 * errors and to populate the column-pill dropdown.
 */
import { buildSqlDisplaySegments } from "$/lib/sql/buildSqlDisplaySegments.ts";
import type {
  SqlDisplayCatalog,
  SqlDisplaySegment,
} from "$/lib/sql/sqlDisplay.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

export type SqlScope = {
  /** Datasets referenced anywhere in the SQL (catalog-resolved). */
  datasetIds: ReadonlySet<DatasetId>;
  /** Names of every column belonging to any in-scope dataset. */
  columnNames: ReadonlySet<string>;
  /**
   * Column tokens that appear in the SQL but whose name does not match any
   * column from an in-scope dataset. Ordered by appearance.
   */
  outOfScopeColumnTokens: ReadonlyArray<{
    name: string;
    start: number;
    end: number;
    raw: string;
  }>;
};

/**
 * Compute the in-scope datasets, the union of their columns, and the column
 * tokens whose names aren't reachable from any in-scope dataset.
 *
 * Scope is currently coarse: any dataset reference in the SQL (FROM, JOIN,
 * subquery, CTE, anywhere) counts as in-scope. Out-of-scope columns are
 * detected by name only — column-alias resolution like `t.foo` vs `u.foo`
 * is intentionally not attempted yet (the catalog does not carry per-alias
 * bindings).
 */
export function computeSqlScope(input: {
  sql: string;
  catalog: SqlDisplayCatalog;
}): SqlScope {
  const { sql, catalog } = input;
  const segments = buildSqlDisplaySegments({ sql, catalog });

  const datasetIds = new Set<DatasetId>();
  for (const seg of segments) {
    if (seg.kind === "dataset") {
      datasetIds.add(seg.datasetId);
    }
  }

  const columnNames = new Set<string>();
  for (const dataset of catalog.datasets) {
    if (!datasetIds.has(dataset.id)) {
      continue;
    }
    for (const col of dataset.columns) {
      columnNames.add(col.name);
    }
  }

  const outOfScopeColumnTokens: Array<{
    name: string;
    start: number;
    end: number;
    raw: string;
  }> = [];
  if (datasetIds.size > 0) {
    for (const seg of segments) {
      if (seg.kind !== "column") {
        continue;
      }
      if (columnNames.has(seg.name)) {
        continue;
      }
      outOfScopeColumnTokens.push({
        name: seg.name,
        start: seg.start,
        end: seg.end,
        raw: seg.raw,
      });
    }
  }

  return { datasetIds, columnNames, outOfScopeColumnTokens };
}

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

/**
 * Re-export so consumers can re-tokenize easily without pulling the lower
 * helper directly.
 */
export type { SqlDisplaySegment };
