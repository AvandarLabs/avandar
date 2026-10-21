import { promiseMapSequential } from "@avandar/utils";
import {
  advanceCrawlCheckpoint,
  readCrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import { ETL_DEFAULT_SCOPE } from "@etl/EtlEngine/etlScopes";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  CrawlCheckpoint,
  CrawlStart,
} from "@etl/EtlEngine/crawlCheckpoint/crawlCheckpoint";
import type {
  EtlDriveReport,
  EtlEngineConfig,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
  EtlStores,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

/** What one drive's crawl needs. */
export type CrawlDriveArgs<TDrive, TConnection> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection>;
  drive: TDrive;
  /** The drive's position in `listDrives` order. */
  driveIndex: number;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  /**
   * How many more connections the run's limit allows. At 0 or below the
   * drive is skipped.
   */
  remaining: number;
  syncedAt: Date;
}>;

/** One drive's report, plus what the drive threw when it failed. */
export type CrawlDriveResult = Readonly<{
  report: EtlDriveReport;
  /**
   * What the drive threw, kept whole so its class and stack survive. Only
   * meaningful when `report.status` is `failed`.
   */
  error?: unknown;
}>;

type _DriveArgs<TDrive, TConnection> = CrawlDriveArgs<TDrive, TConnection> &
  Readonly<{ driveKey: string }>;

type _PagesArgs<TDrive, TConnection> = _DriveArgs<TDrive, TConnection> &
  CrawlStart;

type _DriveCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
}>;

type _DriveProgress = _DriveCounts &
  Readonly<{
    selection: ConnectionSelectionState;
    checkpoint: CrawlCheckpoint | undefined;
  }>;

/**
 * How a drive's crawl ended. A failure is its own variant, so a drive that
 * throws `undefined` is still failed.
 */
type _DriveOutcome =
  | Readonly<{ status: "ok" | "skipped" }>
  | Readonly<{ status: "failed"; error: unknown }>;

type _DriveResultArgs = Readonly<{
  driveKey: string;
  window: EtlRunWindow;
  counts: _DriveCounts;
  outcome: _DriveOutcome;
}>;

const NO_DRIVE_COUNTS: _DriveCounts = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
  newestTimestamp: undefined,
};

function _createProgress(args: {
  remaining: number;
  checkpoint: CrawlCheckpoint | undefined;
}): _DriveProgress {
  return {
    ...NO_DRIVE_COUNTS,
    selection: {
      seenIds: new Set(),
      lastTimestamp: undefined,
      remaining: args.remaining,
    },
    checkpoint: args.checkpoint,
  };
}

function _buildDriveResult(args: _DriveResultArgs): CrawlDriveResult {
  const { counts, outcome } = args;
  const base = {
    driveKey: args.driveKey,
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

/** The result for a drive that never got as far as fetching a page. */
function _buildUncrawledDriveResult(args: {
  driveKey: string;
  options: EtlRunOptions;
  outcome: _DriveOutcome;
}): CrawlDriveResult {
  return _buildDriveResult({
    driveKey: args.driveKey,
    // With no checkpoint read, the window is the run's own bounds.
    window: resolveRunWindow({
      options: args.options,
      highWaterMark: undefined,
    }),
    counts: NO_DRIVE_COUNTS,
    outcome: args.outcome,
  });
}

/**
 * Reads the drive's checkpoint, and its window from it. Only a pipeline with
 * incremental config keeps checkpoints.
 */
function _readDriveStart<TDrive, TConnection>(
  args: _DriveArgs<TDrive, TConnection>,
): Promise<CrawlStart> {
  const { config } = args;
  return readCrawlStart({
    store:
      config.incremental === undefined ? undefined : args.stores.checkpoints,
    key: {
      pipelineName: config.name,
      driveKey: args.driveKey,
      scopeKey: ETL_DEFAULT_SCOPE.key,
    },
    options: args.options,
  });
}

/**
 * Throws when a relation's `sourceUpdatedAt` is later than its connection's
 * timestamp. The two should come from one source date, and a later relation
 * date would write a `date_of_last_update` beyond what the crawl's checkpoint
 * has reached.
 */
function _assertRelationsNotNewer<TDrive, TConnection>(args: {
  pagesArgs: _PagesArgs<TDrive, TConnection>;
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

async function _transformConnections<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection> &
    Readonly<{ connections: readonly TConnection[] }>,
): Promise<Relation[]> {
  const { config } = args;
  const relationsByConnection = await promiseMapSequential(
    args.connections,
    async (connection) => {
      const relations = await config.transform({
        drive: args.drive,
        connection,
        pipelineRunId: args.pipelineRunId,
      });
      _assertRelationsNotNewer({ pagesArgs: args, connection, relations });
      return relations;
    },
  );
  return relationsByConnection.flat();
}

function _buildLoadContext<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection>,
): LoadRelationsPageContext {
  return {
    pipelineName: args.config.name,
    pipelineRunId: args.pipelineRunId,
    service: args.config.service,
    driveKey: args.driveKey,
    scopeKey: ETL_DEFAULT_SCOPE.key,
    syncedAt: args.syncedAt,
    stores: args.stores,
    bucket: args.config.output.bucket,
  };
}

async function _processPage<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection> &
    Readonly<{ page: readonly TConnection[]; progress: _DriveProgress }>,
): Promise<_DriveProgress> {
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
    connectionsFetched: progress.connectionsFetched + connections.length,
    relationsWritten: progress.relationsWritten + loaded.written,
    relationsUnchanged: progress.relationsUnchanged + loaded.unchanged,
    newestTimestamp: pageTimestamps.at(-1) ?? progress.newestTimestamp,
    selection: state,
    // The page is loaded, so the checkpoint may move past it.
    checkpoint: await advanceCrawlCheckpoint({
      checkpoint: progress.checkpoint,
      pageTimestamps,
      syncedAt: args.syncedAt,
      pipelineRunId: args.pipelineRunId,
    }),
  };
}

async function _crawlPages<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection>,
): Promise<Readonly<{ progress: _DriveProgress; outcome: _DriveOutcome }>> {
  let progress = _createProgress({
    remaining: args.remaining,
    checkpoint: args.checkpoint,
  });
  try {
    const pages = args.config.extract({
      drive: args.drive,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
    });
    // Sequential on purpose: each page is written, and the checkpoint moved
    // past it, before the next is fetched, so the listings table always
    // holds an oldest-first prefix of the drive up to the checkpoint. That
    // is what makes the checkpoint safe to resume from.
    for await (const page of pages) {
      progress = await _processPage({ ...args, page, progress });
      if (progress.selection.remaining <= 0) {
        break;
      }
    }
    return { progress, outcome: { status: "ok" } };
  } catch (error: unknown) {
    return { progress, outcome: { status: "failed", error } };
  }
}

function _readDriveKey<TDrive, TConnection>(
  args: CrawlDriveArgs<TDrive, TConnection>,
): Readonly<{ driveKey: string }> | Readonly<{ error: unknown }> {
  try {
    return { driveKey: args.config.getDriveKey(args.drive) };
  } catch (error: unknown) {
    return { error };
  }
}

async function _crawlKeyedDrive<TDrive, TConnection>(
  args: _DriveArgs<TDrive, TConnection>,
): Promise<CrawlDriveResult> {
  const { driveKey, options } = args;
  if (args.remaining <= 0) {
    return _buildUncrawledDriveResult({
      driveKey,
      options,
      outcome: { status: "skipped" },
    });
  }
  try {
    const start = await _readDriveStart(args);
    const { progress, outcome } = await _crawlPages({ ...args, ...start });
    return _buildDriveResult({
      driveKey,
      window: start.window,
      counts: progress,
      outcome,
    });
  } catch (error: unknown) {
    // _crawlPages reports its own failures, so only reading the checkpoint
    // lands here.
    return _buildUncrawledDriveResult({
      driveKey,
      options,
      outcome: { status: "failed", error },
    });
  }
}

/**
 * Crawls one drive: reads its key, checkpoint, and window, then fetches,
 * transforms, and loads one page at a time until the source runs out or
 * the run's limit is reached, moving the checkpoint past each loaded page.
 * A drive with no limit left is skipped without a request. A failure never
 * escapes: the drive is reported `failed` with the counts of what it wrote
 * before the failure, and the result keeps what it threw. A drive whose key
 * cannot be read is reported as `listDrives[<index>]`.
 *
 * @returns The drive's report and, when it failed, its error.
 */
export async function crawlDrive<TDrive, TConnection>(
  args: CrawlDriveArgs<TDrive, TConnection>,
): Promise<CrawlDriveResult> {
  const keyRead = _readDriveKey(args);
  if (!("driveKey" in keyRead)) {
    return _buildUncrawledDriveResult({
      driveKey: `listDrives[${args.driveIndex}]`,
      options: args.options,
      outcome: { status: "failed", error: keyRead.error },
    });
  }
  return _crawlKeyedDrive({ ...args, driveKey: keyRead.driveKey });
}
