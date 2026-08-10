/**
 * Helpers for reasoning about which datasets and columns are in scope inside
 * a SQL string. Used by {@link AvaSqlBlock} (and the SQL pill UI in
 * `createSqlDisplayCodeMirrorExtension`) to mark out-of-scope column
 * references as errors and to populate the column-pill dropdown.
 */
import { prop } from "@avandar/utils";
import { buildSqlDisplaySegments } from "@/components/sql/sql-helpers/buildSqlDisplaySegments/buildSqlDisplaySegments";
import type {
  SqlDisplayCatalog,
  SqlDisplaySegment,
} from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

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

  const datasetIds = new Set(
    segments
      .filter((seg): seg is Extract<SqlDisplaySegment, { kind: "dataset" }> => {
        return seg.kind === "dataset";
      })
      .map(prop("datasetId")),
  );

  const columnNames = new Set(
    catalog.datasets
      .filter((dataset) => {
        return datasetIds.has(dataset.id);
      })
      .flatMap((dataset) => {
        return dataset.columns.map(prop("name"));
      }),
  );

  const outOfScopeColumnTokens =
    datasetIds.size > 0 ?
      segments
        .filter(
          (seg): seg is Extract<SqlDisplaySegment, { kind: "column" }> => {
            return seg.kind === "column" && !columnNames.has(seg.name);
          },
        )
        .map((seg) => {
          return {
            name: seg.name,
            start: seg.start,
            end: seg.end,
            raw: seg.raw,
          };
        })
    : [];

  return { datasetIds, columnNames, outOfScopeColumnTokens };
}
