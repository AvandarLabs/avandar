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
  /** Existing identity context for SQL edits and reloads. */
  previousQuery?: StructuredQuery.Partial;
  /** Complete ready source catalog for the current data source. */
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
