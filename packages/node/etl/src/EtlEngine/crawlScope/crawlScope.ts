import { promiseMapSequential } from "@avandar/utils";
import {
  advanceCrawlCheckpoint,
  readCrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import {
  createCrawlMetricsRecorder,
  NO_CRAWL_METRICS,
} from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  CrawlCheckpoint,
  CrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import type { CrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import type {
  EtlClock,
  EtlCrawlMetrics,
  EtlCrawlReport,
  EtlEngineConfig,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
  EtlScope,
  EtlStores,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

/** What one scope's crawl needs. */
export type CrawlScopeArgs<
  TDrive,
  TConnection,
  TScope extends EtlScope,
> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  drive: TDrive;
  driveKey: string;
  scope: TScope;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  /**
   * How many more connections the run's limit allows. At 0 or below the
   * crawl is skipped.
   */
  remaining: number;
  syncedAt: Date;
  /** Dates the crawl and times its stages. */
  clock: EtlClock;
}>;

/** One crawl's report, plus what the crawl threw when it failed. */
export type CrawlScopeResult = Readonly<{
  report: EtlCrawlReport;
  /**
   * What the crawl threw, kept whole so its class and stack survive. Only
   * meaningful when `report.status` is `failed`.
   */
  error?: unknown;
}>;

/**
 * How a crawl ended. A failure is its own variant, so a crawl that throws
 * `undefined` is still failed.
 */
export type CrawlOutcome =
  | Readonly<{ status: "ok" | "skipped" }>
  | Readonly<{ status: "failed"; error: unknown }>;

type _PagesArgs<TDrive, TConnection, TScope extends EtlScope> = CrawlScopeArgs<
  TDrive,
  TConnection,
  TScope
> &
  Readonly<{
    window: EtlRunWindow;
    /** The scope's checkpoint as the crawl found it. */
    startCheckpoint: CrawlCheckpoint | undefined;
    /** The crawl's metrics recorder. */
    metrics: CrawlMetricsRecorder;
  }>;

type _CrawlCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
}>;

type _CrawlProgress = _CrawlCounts &
  Readonly<{
    selection: ConnectionSelectionState;
    checkpoint: CrawlCheckpoint | undefined;
  }>;

/** A page that finished loading, before the checkpoint moves past it. */
type _LoadedPage = Readonly<{
  progress: _CrawlProgress;
  pageTimestamps: readonly Date[];
}>;

type _CrawlResultArgs = Readonly<{
  driveKey: string;
  scopeKey: string;
  window: EtlRunWindow;
  counts: _CrawlCounts;
  outcome: CrawlOutcome;
  startedAt: Date;
  finishedAt: Date;
  checkpointBefore: Date | undefined;
  checkpointAfter: Date | undefined;
  metrics: EtlCrawlMetrics;
}>;

const NO_CRAWL_COUNTS: _CrawlCounts = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
  newestTimestamp: undefined,
};

function _createProgress(args: {
  remaining: number;
  checkpoint: CrawlCheckpoint | undefined;
}): _CrawlProgress {
  return {
    ...NO_CRAWL_COUNTS,
    selection: {
      seenIds: new Set(),
      lastTimestamp: undefined,
      remaining: args.remaining,
    },
    checkpoint: args.checkpoint,
  };
}

function _buildCrawlResult(args: _CrawlResultArgs): CrawlScopeResult {
  const { counts, outcome } = args;
  const base = {
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    window: args.window,
    connectionsFetched: counts.connectionsFetched,
    relationsWritten: counts.relationsWritten,
    relationsUnchanged: counts.relationsUnchanged,
    newestTimestamp: counts.newestTimestamp,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    checkpointBefore: args.checkpointBefore,
    checkpointAfter: args.checkpointAfter,
    metrics: args.metrics,
  };
  if (outcome.status !== "failed") {
    return { report: { ...base, status: outcome.status } };
  }
  const { error } = outcome;
  return {
    report: {
      ...base,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    },
    error,
  };
}

/**
 * The result for a crawl that never got as far as fetching a page: one
 * skipped for the limit, one whose checkpoint could not be read, or a drive
 * that failed before its scopes were known. It reports zero metrics.
 *
 * @param args.driveKey - The drive, or `listDrives[<index>]`.
 * @param args.scopeKey - The scope, or `ETL_UNLISTED_SCOPE_KEY`.
 * @param args.options - The run's options, for the reported window.
 * @param args.outcome - Skipped, or failed with what was thrown.
 * @param args.startedAt - When the crawl was reached.
 * @param args.finishedAt - When it was given up.
 * @returns The result, with zero counts.
 */
export function buildUncrawledCrawlResult(args: {
  driveKey: string;
  scopeKey: string;
  options: EtlRunOptions;
  outcome: CrawlOutcome;
  startedAt: Date;
  finishedAt: Date;
}): CrawlScopeResult {
  return _buildCrawlResult({
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    // With no checkpoint read, the window is the run's own bounds.
    window: resolveRunWindow({
      options: args.options,
      checkpoint: undefined,
    }),
    counts: NO_CRAWL_COUNTS,
    outcome: args.outcome,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    checkpointBefore: undefined,
    checkpointAfter: undefined,
    metrics: NO_CRAWL_METRICS,
  });
}

/**
 * Reads the scope's checkpoint, and its window from it. Only a pipeline with
 * incremental config keeps checkpoints.
 */
function _readScopeStart<TDrive, TConnection, TScope extends EtlScope>(
  args: CrawlScopeArgs<TDrive, TConnection, TScope>,
): Promise<CrawlStart> {
  const { config } = args;
  return readCrawlStart({
    store:
      config.incremental === undefined ? undefined : args.stores.checkpoints,
    key: {
      pipelineName: config.name,
      driveKey: args.driveKey,
      scopeKey: args.scope.key,
    },
    options: args.options,
  });
}

/**
 * Throws when a relation's `sourceUpdatedAt` is later than its connection's
 * timestamp. The two should come from one source date, and a later relation
 * date would write a `date_of_last_update` beyond what the scope's
 * checkpoint has reached.
 */
function _assertRelationsNotNewer<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(args: {
  pagesArgs: _PagesArgs<TDrive, TConnection, TScope>;
  connection: TConnection;
  relations: readonly Relation[];
}): void {
  const { config, driveKey } = args.pagesArgs;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  if (getConnectionTimestamp === undefined) {
    return;
  }
  const connectionTime = getConnectionTimestamp(args.connection);
  const newerUpdate = args.relations
    .map((relation) => {
      return relation.sourceUpdatedAt;
    })
    .find((updatedAt) => {
      return (
        updatedAt !== undefined &&
        updatedAt.getTime() > connectionTime.getTime()
      );
    });
  if (newerUpdate !== undefined) {
    throw new Error(
      `Drive ${driveKey} returned ${config.getConnectionId(args.connection)} with a relation updated at ${newerUpdate.toISOString()}, later than the connection's timestamp ${connectionTime.toISOString()}. A relation's sourceUpdatedAt must not be later than its connection's timestamp.`,
    );
  }
}

async function _transformConnections<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(
  args: _PagesArgs<TDrive, TConnection, TScope> &
    Readonly<{ connections: readonly TConnection[] }>,
): Promise<Relation[]> {
  const { config } = args;
  const relationsByConnection = await promiseMapSequential(
    args.connections,
    async (connection) => {
      const relations = await config.transform({
        drive: args.drive,
        scope: args.scope,
        connection,
        pipelineRunId: args.pipelineRunId,
        metrics: args.metrics.pipelineMetrics,
      });
      _assertRelationsNotNewer({ pagesArgs: args, connection, relations });
      return relations;
    },
  );
  return relationsByConnection.flat();
}

function _buildLoadContext<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): LoadRelationsPageContext {
  return {
    pipelineName: args.config.name,
    pipelineRunId: args.pipelineRunId,
    service: args.config.service,
    driveKey: args.driveKey,
    scopeKey: args.scope.key,
    syncedAt: args.syncedAt,
    stores: args.stores,
    bucket: args.config.output.bucket,
    metrics: args.metrics,
  };
}

/**
 * Selects, transforms, and loads one page, and adds it to the crawl's
 * counts. The checkpoint is left where it was.
 */
async function _loadPage<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope> &
    Readonly<{ page: readonly TConnection[]; progress: _CrawlProgress }>,
): Promise<_LoadedPage> {
  const { config, progress } = args;
  const getConnectionTimestamp = config.incremental?.getConnectionTimestamp;
  const { connections, state } = selectPageConnections({
    page: args.page,
    driveKey: args.driveKey,
    window: args.window,
    state: progress.selection,
    getConnectionId: config.getConnectionId,
    getConnectionTimestamp,
  });
  const relations = await args.metrics.time("transformMs", () => {
    return _transformConnections({ ...args, connections });
  });
  const loaded = await loadRelationsPage({
    relations,
    context: _buildLoadContext(args),
  });
  const pageTimestamps =
    getConnectionTimestamp === undefined
      ? []
      : connections.map(getConnectionTimestamp);
  return {
    progress: {
      connectionsFetched: progress.connectionsFetched + connections.length,
      relationsWritten: progress.relationsWritten + loaded.written,
      relationsUnchanged: progress.relationsUnchanged + loaded.unchanged,
      newestTimestamp: pageTimestamps.at(-1) ?? progress.newestTimestamp,
      selection: state,
      checkpoint: progress.checkpoint,
    },
    pageTimestamps,
  };
}

/**
 * Yields the extract's pages, timing each wait for the next page as the
 * crawl's extract stage and counting the pages. Closes the extract's
 * iterator when the crawl stops early, as `for await` would.
 */
async function* _timePages<TConnection>(args: {
  pages: AsyncIterable<readonly TConnection[]>;
  metrics: CrawlMetricsRecorder;
}): AsyncGenerator<readonly TConnection[]> {
  const iterator = args.pages[Symbol.asyncIterator]();
  try {
    // Sequential on purpose: each `next()` is timed on its own, which a
    // `for await` over the extract cannot do.
    while (true) {
      const nextPage = await args.metrics.time("extractMs", () => {
        return iterator.next();
      });
      if (nextPage.done === true) {
        return;
      }
      args.metrics.count("pageCount", 1);
      yield nextPage.value;
    }
  } finally {
    await iterator.return?.();
  }
}

/** Starts the scope's extract, with each page's wait timed. */
function _extractTimedPages<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): AsyncGenerator<readonly TConnection[]> {
  return _timePages({
    pages: args.config.extract({
      drive: args.drive,
      scope: args.scope,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
      metrics: args.metrics.pipelineMetrics,
    }),
    metrics: args.metrics,
  });
}

async function _crawlPages<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): Promise<Readonly<{ progress: _CrawlProgress; outcome: CrawlOutcome }>> {
  let progress = _createProgress({
    remaining: args.remaining,
    checkpoint: args.startCheckpoint,
  });
  try {
    const pages = _extractTimedPages(args);
    // Sequential on purpose: each page is written, and the checkpoint moved
    // past it, before the next is fetched, so the listings table always
    // holds an oldest-first prefix of the scope up to the checkpoint. That
    // is what makes the checkpoint safe to resume from.
    for await (const page of pages) {
      const loaded = await _loadPage({ ...args, page, progress });
      // Counted before the checkpoint write, so a failed write still
      // reports the page it loaded.
      progress = loaded.progress;
      // The page is loaded, so the checkpoint may move past it.
      const checkpoint = await args.metrics.time("checkpointWriteMs", () => {
        return advanceCrawlCheckpoint({
          checkpoint: progress.checkpoint,
          pageTimestamps: loaded.pageTimestamps,
          syncedAt: args.syncedAt,
          pipelineRunId: args.pipelineRunId,
        });
      });
      progress = { ...progress, checkpoint };
      if (progress.selection.remaining <= 0) {
        break;
      }
    }
    return { progress, outcome: { status: "ok" } };
  } catch (error: unknown) {
    return { progress, outcome: { status: "failed", error } };
  }
}

/**
 * Reads the scope's checkpoint, timed as the crawl's setup, then crawls its
 * pages and builds the result with the crawl's metrics.
 *
 * @throws Only when the checkpoint cannot be read.
 */
async function _crawlFromStart<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(options: {
  args: CrawlScopeArgs<TDrive, TConnection, TScope>;
  startedAt: Date;
}): Promise<CrawlScopeResult> {
  const { args } = options;
  const metrics = createCrawlMetricsRecorder(args.clock);
  const start = await metrics.time("setupMs", () => {
    return _readScopeStart(args);
  });
  const { progress, outcome } = await _crawlPages({
    ...args,
    window: start.window,
    startCheckpoint: start.checkpoint,
    metrics,
  });
  return _buildCrawlResult({
    driveKey: args.driveKey,
    scopeKey: args.scope.key,
    window: start.window,
    counts: progress,
    outcome,
    startedAt: options.startedAt,
    finishedAt: args.clock.now(),
    checkpointBefore: start.checkpoint?.current,
    checkpointAfter: progress.checkpoint?.current,
    metrics: metrics.snapshot(progress),
  });
}

/**
 * Crawls one scope of one drive: reads the scope's checkpoint and window,
 * then fetches, transforms, and loads one page at a time until the source
 * runs out or the run's limit is reached, moving the checkpoint past each
 * loaded page. A crawl with no limit left is skipped without a request. A
 * failure never escapes: the crawl is reported `failed` with the counts of
 * what it wrote before the failure, and the result keeps what it threw.
 * Dates the crawl, times its stages, and reports its metrics.
 *
 * @returns The crawl's report and, when it failed, its error.
 */
export async function crawlScope<TDrive, TConnection, TScope extends EtlScope>(
  args: CrawlScopeArgs<TDrive, TConnection, TScope>,
): Promise<CrawlScopeResult> {
  const { driveKey, options, clock } = args;
  const scopeKey = args.scope.key;
  const startedAt = clock.now();
  if (args.remaining <= 0) {
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "skipped" },
      startedAt,
      finishedAt: startedAt,
    });
  }
  try {
    return await _crawlFromStart({ args, startedAt });
  } catch (error: unknown) {
    // _crawlPages reports its own failures, so only reading the checkpoint
    // lands here.
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "failed", error },
      startedAt,
      finishedAt: clock.now(),
    });
  }
}
