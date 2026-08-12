import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { VirtualDatasetId } from "$/models/datasets/VirtualDataset/VirtualDataset.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Identifies the currently open saved dataset in the Data Explorer, if any.
 * Stored in state so the toolbar can offer "Save Over" (virtual datasets
 * only) and "Delete" actions. `virtualDatasetId` is only set when
 * `sourceType === "virtual"`.
 */
export type OpenDatasetInfo = {
  datasetId: DatasetId;
  name: string;
  /**
   * Source type of the open dataset. Optional because the legacy URL-hydration
   * path reconstructs `openDataset` from query params that don't carry it; the
   * dataset drawer always sets it when opening from the Saved list.
   */
  sourceType?: DatasetSource.SourceType;
  virtualDatasetId?: VirtualDatasetId;
};

export type DataExplorerAppState = {
  query: PartialStructuredQuery;

  /**
   * If raw SQL was generated, we should use that for our query instead of
   * the structured query.
   */
  // TODO(jpsyx): for consistency, rename this to `rawSql`
  rawSql: string | undefined;

  /**
   * The natural-language prompt that produced the current `rawSql`, if any.
   * Persisted in state so downstream actions (e.g. saving to a dashboard as
   * a DataViz block) can carry the prompt alongside the generated SQL.
   */
  nlPrompt: string | undefined;

  vizConfig: VizConfig;

  /** The currently open saved dataset, or `undefined` if none is open. */
  openDataset: OpenDatasetInfo | undefined;

  /**
   * Runtime error message from the most recent query attempt, if any. Set by
   * `DataExplorerApp` after `useDataQuery` finishes; consumed by the chat
   * panel to offer a one-click "Regenerate with the error" affordance when
   * the auto-applied SQL turned out to be invalid.
   */
  lastQueryError: string | undefined;

  /**
   * Whether `rawSql` and `query` (the structured form) currently represent
   * the same query. `true` when both are empty, when SQL was successfully
   * parsed into the form, or when the form generated the current SQL. `false`
   * when SQL was too complex to map fully onto the form (best-effort
   * parsing): the form shows an approximation but executing the SQL still
   * runs the original text.
   */
  isStructuredQueryInSync: boolean;

  /**
   * Human-readable reasons describing what part of `rawSql` could not be
   * represented in the manual form. Empty when the two are in sync.
   */
  sqlSyncWarnings: readonly SqlFailedMappingReason[];

  /**
   * Columns from the most recent successful query result. Stored in state
   * so cross-cutting consumers (notably the chat panel) can read the
   * current result schema without holding a reference to the React Query
   * cache. `undefined` while no query has succeeded.
   */
  lastResultColumns: readonly QueryResultColumn[] | undefined;
};

export const INITIAL_DATA_EXPLORER_STATE: DataExplorerAppState = {
  query: StructuredQuery.makeEmpty(),
  vizConfig: {
    vizType: "table",
  },
  rawSql: undefined,
  nlPrompt: undefined,
  openDataset: undefined,
  lastQueryError: undefined,
  isStructuredQueryInSync: true,
  sqlSyncWarnings: [],
  lastResultColumns: undefined,
};
