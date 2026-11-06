import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/** Outcome of parsing a SQL string into a partial structured query. */
export type SqlMappingResult = {
  /** The best-effort structured query produced from the SQL. */
  query: StructuredQuery.Partial;
  /**
   * Whether the manual form represents the SQL faithfully. When `false`,
   * `unmappedReasons` explains what was dropped.
   */
  isFullyMapped: boolean;
  /** Human-readable reasons why the mapping is partial. */
  unmappedReasons: readonly SqlFailedMappingReason[];
};

/** Inputs required to parse a SQL string into a structured query. */
export type SqlMappingInput = {
  /** The SQL string to parse. */
  sql: string;
  /**
   * The structured query this SQL replaces, if any. A column the SQL still
   * selects keeps its ID from this query when it matches one unambiguously,
   * for example after a hand edit that only renames an alias.
   */
  previousQuery?: StructuredQuery.Partial;
  /**
   * The current data source's fully loaded columns. When given, the parsed
   * query's source columns reuse these IDs ahead of `previousQuery`'s.
   */
  sourceColumns?: readonly QueryColumn.T[];
  /**
   * Datasets in the current workspace that the query may reference. We use
   * these to resolve `FROM <table>` back to a `DatasetModel`. The table name
   * we look for is the dataset's id (matching how `structuredQueryToSql`
   * emits SQL).
   */
  datasets: ReadonlyArray<{
    dataset: Dataset.T;
    columns: readonly DatasetColumn.T[];
  }>;
};

export type DatasetWithColumns = SqlMappingInput["datasets"][number];
