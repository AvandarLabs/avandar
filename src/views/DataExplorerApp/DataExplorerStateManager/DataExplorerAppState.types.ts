import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { VirtualDatasetId } from "$/models/datasets/VirtualDataset/VirtualDataset.types";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

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

/**
 * Every column of one data source, whether or not a query selects it, and
 * whether those columns have finished loading. Lets a query control, such as
 * a column picker or a filter builder, offer the source's columns and wait
 * for them to load before judging which columns the source has.
 */
export type SourceColumnCatalog = {
  sourceKey: QueryDataSource.TypedId | undefined;
  status: "loading" | "ready";
  columns: readonly QueryColumn.T[];
};

export type DataExplorerAppState = {
  query: PartialStructuredQuery;
  /**
   * The column bindings of the latest bound query result, which keep each
   * `QueryResult` column on the same column ID across runs. Written by
   * `setColumnBindings`. Read by `DataExplorerApp` to bind the next result
   * and by `DataExplorerSaveAsMenuItems` to save the chart to a dashboard.
   */
  columnBindings?: QueryResultColumnBindingRegistry;

  /**
   * Every column of the selected data source, whether or not the query
   * selects it. Read by `DataExplorerManualQueryForm`, which offers these
   * columns to pick and filter on. Written by `setDataSource`,
   * `setSourceColumns`, and `applySqlMapping`.
   */
  sourceCatalog?: SourceColumnCatalog;

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

  vizConfig: AvaVizConfig.T;

  /**
   * A chart config restored from the URL, keyed by `QueryResult` column names
   * because a URL carries no column IDs. The first query result binds those
   * names to the result's column IDs and clears this field. Until then, URL
   * sync keeps writing it back unchanged, so a slow or failed query does not
   * drop it.
   */
  pendingUrlVizConfig?: UiVizConfig;

  /**
   * The last config the user actually saw for each viz type, so switching
   * away from a chart and back restores what they had rather than a fresh
   * projection of the current config.
   *
   * `convertVizConfig` is deliberately lossy: a pie chart has no axes or
   * grid, so a hop through it would otherwise discard the bar chart's
   * styling for good. This map is what makes that round trip survive, and
   * it is why the converters stay a pure projection.
   *
   * Written on the way out of a type, keyed by that type. Entries can go
   * stale when the query changes; they are reconciled against the current
   * result columns on restore rather than being invalidated up front.
   *
   * `Partial<AvaVizConfigRegistry>` correlates each entry with the viz type it
   * is filed under, so a bar config cannot be stored under `"pie"`.
   *
   * In-memory only: this state manager is never persisted, so a reload
   * starts empty.
   */
  vizConfigMemory: Partial<AvaVizConfig.Registry>;

  /**
   * The last config the user saw for each plugin chart type, keyed by
   * `makePluginVizMemoryKey` (`<pluginId>/<pluginVizId>`), so switching away
   * from a plugin chart and back restores its settings.
   *
   * Kept apart from `vizConfigMemory` because every plugin config shares the
   * one `"plugin"` viz type. Written on the way out of a plugin chart type.
   * On the way back in, a remembered column setting is kept only while its
   * column is still in `lastResultColumns` (or while that is unset), and the
   * picked config fills the rest. In-memory only.
   */
  pluginVizConfigMemory: Readonly<Record<string, AvaVizConfig.Plugin>>;

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
  lastResultColumns: readonly QueryResult.ColumnWithId[] | undefined;

  /**
   * What caused the query that is about to run, recorded on `query.ran` and
   * `query.failed`. The explorer re-runs on every pill and limit change, so
   * this is what separates a deliberate run from an incidental one in
   * reporting.
   *
   * Manual-form actions stamp `structured_change` themselves. Every other
   * origin dispatches `setQueryTrigger` so that it holds its final value by
   * the end of the synchronous block that changes the query.
   *
   * The initial value of `structured_change` is never itself observed as a
   * stale trigger: no query key exists until a dispatch changes the query,
   * and by then something has stamped this field. It is also the correct
   * value for the first thing that happens on an untouched form, which is
   * always a manual-form action.
   */
  queryTrigger: UserQueryAnalyticsTrigger;
};

/**
 * The part of the Data Explorer state a plugin command's derived columns
 * replace: the SQL, the structured query and its sync flags, the chart, the
 * column bindings, the source columns, and the prompt. Taken by
 * `useDataExplorerPluginBridge` before it applies the derived columns SQL, and
 * passed back to `restoreDerivedColumnsSnapshot` when the user clicks Undo.
 */
export type DerivedColumnsSnapshot = Pick<
  DataExplorerAppState,
  | "rawSql"
  | "query"
  | "isStructuredQueryInSync"
  | "sqlSyncWarnings"
  | "vizConfig"
  | "columnBindings"
  | "sourceCatalog"
  | "nlPrompt"
>;

export const INITIAL_DATA_EXPLORER_STATE: DataExplorerAppState = {
  query: StructuredQuery.makeEmpty(),
  vizConfig: {
    vizType: "table",
  },
  vizConfigMemory: {},
  pluginVizConfigMemory: {},
  rawSql: undefined,
  nlPrompt: undefined,
  openDataset: undefined,
  lastQueryError: undefined,
  isStructuredQueryInSync: true,
  sqlSyncWarnings: [],
  lastResultColumns: undefined,
  queryTrigger: "structured_change",
};
