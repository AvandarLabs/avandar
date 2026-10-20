import { promiseMapSequential } from "@avandar/utils";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { resolveRunWindow } from "@etl/EtlEngine/resolveRunWindow/resolveRunWindow";
import { selectPageConnections } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";
import type {
  EtlDriveReport,
  EtlEngineConfig,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunWindow,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";
import type { ConnectionSelectionState } from "@etl/EtlEngine/selectPageConnections/selectPageConnections";

/** What one drive's crawl needs. */
export type CrawlDriveArgs<TDrive, TConnection> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection>;
  drive: TDrive;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  /** How many more connections the run's limit allows. */
  remaining: number;
  syncedAt: Date;
}>;

type _DriveArgs<TDrive, TConnection> = CrawlDriveArgs<TDrive, TConnection> &
  Readonly<{ driveKey: string }>;

type _PagesArgs<TDrive, TConnection> = _DriveArgs<TDrive, TConnection> &
  Readonly<{ window: EtlRunWindow }>;

type _DriveProgress = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
  selection: ConnectionSelectionState;
}>;

type _DriveReportArgs = Readonly<{
  driveKey: string;
  window: EtlRunWindow;
  progress: _DriveProgress;
  error: unknown;
}>;

function _createProgress(remaining: number): _DriveProgress {
  return {
    connectionsFetched: 0,
    relationsWritten: 0,
    relationsUnchanged: 0,
    newestTimestamp: undefined,
    selection: { seenIds: new Set(), lastTimestamp: undefined, remaining },
  };
}

async function _buildDriveWindow<TDrive, TConnection>(
  args: _DriveArgs<TDrive, TConnection>,
): Promise<EtlRunWindow> {
  const { config, options } = args;
  // An explicit since wins, and a full run has no lower bound, so neither
  // needs the high-water mark read.
  if (options.mode !== "incremental" || options.since !== undefined) {
    return resolveRunWindow({ options, highWaterMark: undefined });
  }
  const readDefaultHighWaterMark = () => {
    return args.stores.listings.readHighWaterMark({
      pipelineName: config.name,
      apiBaseUrl: args.driveKey,
    });
  };
  const readCustom = config.incremental?.readHighWaterMark;
  const highWaterMark =
    readCustom === undefined
      ? await readDefaultHighWaterMark()
      : await readCustom({
          drive: args.drive,
          driveKey: args.driveKey,
          readDefaultHighWaterMark,
        });
  return resolveRunWindow({ options, highWaterMark });
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
  const relations = await promiseMapSequential(connections, (connection) => {
    return config.transform({
      drive: args.drive,
      connection,
      pipelineRunId: args.pipelineRunId,
    });
  });
  const loaded = await loadRelationsPage({
    relations: relations.flat(),
    context: {
      pipelineName: config.name,
      pipelineRunId: args.pipelineRunId,
      service: config.service,
      driveKey: args.driveKey,
      syncedAt: args.syncedAt,
      stores: args.stores,
      bucket: config.output.bucket,
    },
  });
  const newestConnection = connections.at(-1);
  return {
    connectionsFetched: progress.connectionsFetched + connections.length,
    relationsWritten: progress.relationsWritten + loaded.written,
    relationsUnchanged: progress.relationsUnchanged + loaded.unchanged,
    newestTimestamp:
      newestConnection === undefined || getConnectionTimestamp === undefined
        ? progress.newestTimestamp
        : getConnectionTimestamp(newestConnection),
    selection: state,
  };
}

async function _crawlPages<TDrive, TConnection>(
  args: _PagesArgs<TDrive, TConnection>,
): Promise<Readonly<{ progress: _DriveProgress; error?: unknown }>> {
  let progress = _createProgress(args.remaining);
  try {
    const pages = args.config.extract({
      drive: args.drive,
      window: args.window,
      pipelineRunId: args.pipelineRunId,
    });
    // Sequential on purpose: each page is written before the next is
    // fetched, so the listings table always holds an oldest-first prefix of
    // the drive. That is what makes the high-water mark safe to resume from.
    for await (const page of pages) {
      progress = await _processPage({ ...args, page, progress });
      if (progress.selection.remaining <= 0) {
        break;
      }
    }
    return { progress };
  } catch (error: unknown) {
    return { progress, error };
  }
}

function _buildDriveReport(args: _DriveReportArgs): EtlDriveReport {
  const { progress, error } = args;
  const base = {
    driveKey: args.driveKey,
    window: args.window,
    connectionsFetched: progress.connectionsFetched,
    relationsWritten: progress.relationsWritten,
    relationsUnchanged: progress.relationsUnchanged,
    newestTimestamp: progress.newestTimestamp,
  };
  if (error === undefined) {
    return { ...base, status: "ok" };
  }
  return {
    ...base,
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Crawls one drive: resolves its window, then fetches, transforms, and loads
 * one page at a time until the source runs out or the run's limit is
 * reached. A failure never escapes: the drive is reported `failed`, with the
 * counts of what it wrote before the failure.
 *
 * @returns The drive's report.
 */
export async function crawlDrive<TDrive, TConnection>(
  args: CrawlDriveArgs<TDrive, TConnection>,
): Promise<EtlDriveReport> {
  const driveKey = args.config.getDriveKey(args.drive);
  try {
    const window = await _buildDriveWindow({ ...args, driveKey });
    const { progress, error } = await _crawlPages({
      ...args,
      driveKey,
      window,
    });
    return _buildDriveReport({ driveKey, window, progress, error });
  } catch (error: unknown) {
    return _buildDriveReport({
      driveKey,
      window: { since: args.options.since, until: args.options.until },
      progress: _createProgress(args.remaining),
      error,
    });
  }
}
