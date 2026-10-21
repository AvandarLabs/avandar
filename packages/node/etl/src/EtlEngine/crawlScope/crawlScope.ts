import { promiseMapSequential } from "@avandar/utils";
import {
  advanceCrawlCheckpoint,
  readCrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  CrawlCheckpoint,
  CrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import type {
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
export type CrawlScopeArgs<TDrive, TConnection, TScope extends EtlScope> =
  Readonly<{
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
 * that failed before its scopes were known.
 *
 * @param args.driveKey - The drive, or `listDrives[<index>]`.
 * @param args.scopeKey - The scope, or `ETL_UNLISTED_SCOPE_KEY`.
 * @param args.options - The run's options, for the reported window.
 * @param args.outcome - Skipped, or failed with what was thrown.
 * @returns The result, with zero counts.
 */
export function buildUncrawledCrawlResult(args: {
  driveKey: string;
  scopeKey: string;
  options: EtlRunOptions;
  outcome: CrawlOutcome;
}): CrawlScopeResult {
  return _buildCrawlResult({
    driveKey: args.driveKey,
    scopeKey: args.scopeKey,
    // With no checkpoint read, the window is the run's own bounds.
    window: resolveRunWindow({
      options: args.options,
      highWaterMark: undefined,
    }),
    counts: NO_CRAWL_COUNTS,
    outcome: args.outcome,
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
  const loaded = await loadRelationsPage({
    relations: await _transformConnections({ ...args, connections }),
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

async function _crawlPages<TDrive, TConnection, TScope extends EtlScope>(
  args: _PagesArgs<TDrive, TConnection, TScope>,
): Promise<Readonly<{ progress: _CrawlProgress; outcome: CrawlOutcome }>> {
  let progress = _createProgress({
    remaining: args.remaining,
    checkpoint: args.startCheckpoint,
  });
  try {
    const pages = args.config.extract({
      drive: args.drive,
      scope: args.scope,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
    });
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
      const checkpoint = await advanceCrawlCheckpoint({
        checkpoint: progress.checkpoint,
        pageTimestamps: loaded.pageTimestamps,
        syncedAt: args.syncedAt,
        pipelineRunId: args.pipelineRunId,
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
 * Crawls one scope of one drive: reads the scope's checkpoint and window,
 * then fetches, transforms, and loads one page at a time until the source
 * runs out or the run's limit is reached, moving the checkpoint past each
 * loaded page. A crawl with no limit left is skipped without a request. A
 * failure never escapes: the crawl is reported `failed` with the counts of
 * what it wrote before the failure, and the result keeps what it threw.
 *
 * @returns The crawl's report and, when it failed, its error.
 */
export async function crawlScope<TDrive, TConnection, TScope extends EtlScope>(
  args: CrawlScopeArgs<TDrive, TConnection, TScope>,
): Promise<CrawlScopeResult> {
  const { driveKey, options } = args;
  const scopeKey = args.scope.key;
  if (args.remaining <= 0) {
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "skipped" },
    });
  }
  try {
    const start = await _readScopeStart(args);
    const { progress, outcome } = await _crawlPages({
      ...args,
      window: start.window,
      startCheckpoint: start.checkpoint,
    });
    return _buildCrawlResult({
      driveKey,
      scopeKey,
      window: start.window,
      counts: progress,
      outcome,
    });
  } catch (error: unknown) {
    // _crawlPages reports its own failures, so only reading the checkpoint
    // lands here.
    return buildUncrawledCrawlResult({
      driveKey,
      scopeKey,
      options,
      outcome: { status: "failed", error },
    });
  }
}
