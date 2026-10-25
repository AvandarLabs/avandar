import type {
  ExecutionDeletionCounts,
  ExecutionDenominators,
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStageTimings,
  ExecutionStart,
} from "@etl/stores/ExecutionStore.types";

/** Stage timings of a crawl that did no work. */
export const NO_STAGE_TIMINGS: ExecutionStageTimings = {
  setupMs: 0,
  extractMs: 0,
  transformMs: 0,
  loadReadMs: 0,
  loadParquetBuildMs: 0,
  loadParquetUploadMs: 0,
  loadWriteMs: 0,
  checkpointWriteMs: 0,
};

/** Denominators of a crawl that did no work. */
export const NO_DENOMINATORS: ExecutionDenominators = {
  pageCount: 0,
  datasetsFetched: 0,
  listingsConsidered: 0,
  listingsWritten: 0,
  listingsUnchanged: 0,
  writeBatches: 0,
  columnsConsidered: 0,
  columnsWritten: 0,
  maxColumnsPerListing: 0,
  sourceCsvBytes: 0,
  parquetBytesWritten: 0,
  parquetRowsWritten: 0,
  parquetUploadsSkipped: 0,
  sourceBytesReported: undefined,
};

/** Deletions of a step that deleted nothing. */
export const NO_DELETIONS: ExecutionDeletionCounts = {
  listingsDeleted: 0,
  listingsKeptInUse: 0,
  listingsDetached: 0,
  checkpointsDeleted: 0,
};

function _toIsoOrNull(date: Date | undefined): string | null {
  return date === undefined ? null : date.toISOString();
}

/**
 * The JSON `rpc_pipeline_executions__start` takes, from an execution's start.
 */
export function buildExecutionStartRow(
  start: ExecutionStart,
): Record<string, unknown> {
  const { invocation } = start;
  return {
    id: start.id,
    pipeline_name: start.pipelineName,
    command: start.command,
    run_mode: start.runMode ?? null,
    is_dry_run: start.isDryRun,
    is_scoped: start.isScoped,
    is_limited: start.isLimited,
    is_windowed: start.isWindowed,
    invoked_via: invocation.invokedVia,
    cli_argv: invocation.cliArgv === undefined ? null : [...invocation.cliArgv],
    request_body: invocation.requestBody ?? null,
    arguments: start.arguments,
    actor: invocation.actor ?? null,
    host: invocation.host ?? null,
    code_version: invocation.codeVersion ?? null,
    started_at: start.startedAt.toISOString(),
  };
}

function _buildTimingColumns(
  timings: ExecutionStageTimings,
): Record<string, number> {
  return {
    setup_ms: timings.setupMs,
    extract_ms: timings.extractMs,
    transform_ms: timings.transformMs,
    load_read_ms: timings.loadReadMs,
    load_parquet_build_ms: timings.loadParquetBuildMs,
    load_parquet_upload_ms: timings.loadParquetUploadMs,
    load_write_ms: timings.loadWriteMs,
    checkpoint_write_ms: timings.checkpointWriteMs,
  };
}

function _buildDenominatorColumns(
  denominators: ExecutionDenominators,
): Record<string, number | null> {
  return {
    page_count: denominators.pageCount,
    datasets_fetched: denominators.datasetsFetched,
    listings_considered: denominators.listingsConsidered,
    listings_written: denominators.listingsWritten,
    listings_unchanged: denominators.listingsUnchanged,
    write_batches: denominators.writeBatches,
    columns_considered: denominators.columnsConsidered,
    columns_written: denominators.columnsWritten,
    max_columns_per_listing: denominators.maxColumnsPerListing,
    source_csv_bytes: denominators.sourceCsvBytes,
    parquet_bytes_written: denominators.parquetBytesWritten,
    parquet_rows_written: denominators.parquetRowsWritten,
    parquet_uploads_skipped: denominators.parquetUploadsSkipped,
    source_bytes_reported: denominators.sourceBytesReported ?? null,
  };
}

function _buildDeletionColumns(
  deletions: ExecutionDeletionCounts,
): Record<string, number> {
  return {
    listings_deleted: deletions.listingsDeleted,
    listings_kept_in_use: deletions.listingsKeptInUse,
    listings_detached: deletions.listingsDetached,
    checkpoints_deleted: deletions.checkpointsDeleted,
  };
}

/**
 * The JSON `rpc_pipeline_executions__record_scope` takes, from one drive and
 * scope of an execution.
 */
export function buildExecutionScopeRow(
  scope: ExecutionScope,
): Record<string, unknown> {
  return {
    drive_key: scope.driveKey,
    scope_key: scope.scopeKey,
    status: scope.status,
    error: scope.error ?? null,
    window_since: _toIsoOrNull(scope.windowSince),
    window_until: _toIsoOrNull(scope.windowUntil),
    checkpoint_before: _toIsoOrNull(scope.checkpointBefore),
    checkpoint_after: _toIsoOrNull(scope.checkpointAfter),
    started_at: scope.startedAt.toISOString(),
    finished_at: scope.finishedAt.toISOString(),
    ..._buildTimingColumns(scope.timings),
    ..._buildDenominatorColumns(scope.denominators),
    ..._buildDeletionColumns(scope.deletions ?? NO_DELETIONS),
    pipeline_metrics: scope.pipelineMetrics,
  };
}

/**
 * The JSON `rpc_pipeline_executions__finish` takes, from how an execution
 * ended. Deletions are left out when the outcome has none, so the function
 * keeps the totals the scope rows add up to.
 */
export function buildExecutionOutcomeRow(
  outcome: ExecutionOutcome,
): Record<string, unknown> {
  const { deletions } = outcome;
  return {
    status: outcome.status,
    error: outcome.error ?? null,
    finished_at: outcome.finishedAt.toISOString(),
    setup_ms: outcome.setupMs,
    ...(deletions === undefined
      ? {}
      : {
          ..._buildDeletionColumns(deletions),
          workspace_datasets_deleted: deletions.workspaceDatasetsDeleted,
        }),
  };
}
