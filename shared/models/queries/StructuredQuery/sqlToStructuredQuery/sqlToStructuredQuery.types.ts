import type { SqlMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

/** Outcome of parsing a SQL string into a partial structured query. */
export type SqlMappingResult = {
  /** The best-effort structured query produced from the SQL. */
  query: PartialStructuredQuery;
  /**
   * Whether the manual form represents the SQL faithfully. When `false`,
   * `unmappedReasons` explains what was dropped.
   */
  isFullyMapped: boolean;
  /** Human-readable reasons why the mapping is partial. */
  unmappedReasons: readonly SqlMappingReason[];
};

/** Inputs required to parse a SQL string into a structured query. */
export type SqlMappingInput = {
  /** The SQL string to parse. */
  sql: string;
  /**
   * Datasets in the current workspace that the query may reference. We use
   * these to resolve `FROM <table>` back to a `DatasetModel`. The table name
   * we look for is the dataset's id (matching how `structuredQueryToSql`
   * emits SQL).
   */
  datasets: ReadonlyArray<{
    dataset: DatasetModel["Read"];
    columns: readonly DatasetColumnRead[];
  }>;
};

export type DatasetWithColumns = SqlMappingInput["datasets"][number];
