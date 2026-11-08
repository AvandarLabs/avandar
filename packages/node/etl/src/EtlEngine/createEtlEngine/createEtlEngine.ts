import { randomUUID } from "node:crypto";
import { promiseReduce } from "@avandar/utils";
import { SYSTEM_CLOCK } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import {
  buildUncrawledCrawlResult,
  crawlScope,
} from "@etl/EtlEngine/crawlScope/crawlScope";
import { createRunProgressReporter } from "@etl/EtlEngine/createRunProgressReporter/createRunProgressReporter";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import {
  ETL_SCOPE_KEY_PATTERN,
  ETL_UNLISTED_SCOPE_KEY,
} from "@etl/EtlEngine/etlScopes";
import { createRunExecutionRecorder } from "@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder";
import { resolveDriveScopes } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";
import { selectRequestedScopes } from "@etl/EtlEngine/selectRequestedScopes/selectRequestedScopes";
import { createSupabaseCheckpointStore } from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
import { createSupabaseDrivesStore } from "@etl/stores/SupabaseDrivesStore/createSupabaseDrivesStore";
import { createSupabaseExecutionStore } from "@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import type { CrawlScopeResult } from "@etl/EtlEngine/crawlScope/crawlScope";
import type {
  ProgressCrawl,
  RunProgressReporter,
} from "@etl/EtlEngine/createRunProgressReporter/createRunProgressReporter";
import type {
  EtlClock,
  EtlCrawlReport,
  EtlDestination,
  EtlDriveScopes,
  EtlEngineConfig,
  EtlEngineInstance,
  EtlPipelineRunId,
  EtlRunMode,
  EtlRunOptions,
  EtlRunReport,
  EtlScope,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";
import type { RunExecutionRecorder } from "@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder";
import type { ResolvedDrive } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";

/** One crawl to run, or a drive that failed before its scopes were known. */
type _CrawlTask<TDrive, TScope extends EtlScope> =
  | Readonly<{ isListed: true; drive: TDrive; driveKey: string; scope: TScope }>
  | Readonly<{ isListed: false; driveKey: string; error: unknown }>;

type _CrawlTasksArgs<TDrive, TConnection, TScope extends EtlScope> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  tasks: ReadonlyArray<_CrawlTask<TDrive, TScope>>;
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  syncedAt: Date;
  clock: EtlClock;
  /**
   * The drive's id in the drives table, written the first time the run
   * reaches the drive, or `undefined` when there is no drives store.
   */
  resolveDriveId: (
    drive: TDrive,
    driveKey: string,
  ) => Promise<string | undefined>;
  /** Called as each crawl ends, in crawl order. */
  onCrawled: (crawl: EtlCrawlReport) => Promise<void>;
}>;

function _assertValidScopeOptions(args: {
  pipelineName: string;
  scopes: readonly string[] | undefined;
}): void {
  const { scopes } = args;
  if (scopes === undefined) {
    return;
  }
  const isValid =
    scopes.length > 0 &&
    scopes.every((scopeKey) => {
      return ETL_SCOPE_KEY_PATTERN.test(scopeKey);
    });
  if (!isValid) {
    throw new EtlRunOptionsError(
      `The ${args.pipelineName} pipeline got the scopes ${JSON.stringify(scopes)}, but scopes must be a non-empty list of scope keys such as format:csv.`,
    );
  }
}

function _assertCanRun<TDrive, TConnection, TScope extends EtlScope>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  options: EtlRunOptions;
}): void {
  const { config, options } = args;
  if (options.mode === "incremental" && config.incremental === undefined) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline does not support incremental runs.`,
    );
  }
  const hasWindow = options.since !== undefined || options.until !== undefined;
  if (hasWindow && config.incremental === undefined) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline does not support --since or --until, because its sources carry no modification time.`,
    );
  }
  const { limit } = options;
  if (limit !== undefined && !(Number.isInteger(limit) && limit >= 0)) {
    throw new EtlRunOptionsError(
      `The ${config.name} pipeline got a limit of ${limit}, but a limit must be an integer of 0 or more.`,
    );
  }
  _assertValidScopeOptions({
    pipelineName: config.name,
    scopes: options.scopes,
  });
}

function _createSupabaseStores(destination: EtlDestination): EtlStores {
  const url = destination.supabase?.url;
  const serviceRoleKey = destination.supabase?.serviceRoleKey;
  if (!url) {
    throw new Error("EtlEngine needs supabase.url to load into Supabase.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "EtlEngine needs supabase.serviceRoleKey to load into Supabase.",
    );
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { output } = destination;
  return {
    listings: createSupabaseListingsStore({
      client,
      listingsTable: output.listingsTable,
      upsertListingsFunction: output.upsertListingsFunction,
    }),
    objects:
      output.bucket === undefined
        ? undefined
        : createSupabaseObjectStore({ client, bucket: output.bucket }),
    checkpoints:
      output.checkpointsTable === undefined
        ? undefined
        : createSupabaseCheckpointStore({
            client,
            checkpointsTable: output.checkpointsTable,
          }),
    executions:
      output.executionFunctions === undefined
        ? undefined
        : createSupabaseExecutionStore({
            client,
            functions: output.executionFunctions,
          }),
    drives:
      output.drivesTable === undefined
        ? undefined
        : createSupabaseDrivesStore({
            client,
            drivesTable: output.drivesTable,
          }),
  };
}

/**
 * The stores a run writes through: the config's own, or Supabase-backed
 * ones.
 *
 * @throws When the config has `incremental` and there is no checkpoint
 * store to resume from.
 */
function _resolveStores<TDrive, TConnection, TScope extends EtlScope>(
  config: EtlEngineConfig<TDrive, TConnection, TScope>,
): EtlStores {
  const stores = config.stores ?? _createSupabaseStores(config);
  if (config.incremental !== undefined && stores.checkpoints === undefined) {
    throw new Error(
      `The ${config.name} pipeline supports incremental runs, so EtlEngine needs somewhere to keep its checkpoints: set output.checkpointsTable, or stores.checkpoints in tests.`,
    );
  }
  return stores;
}

function _buildCrawlTasks<TDrive, TScope extends EtlScope>(
  resolvedDrives: ReadonlyArray<ResolvedDrive<TDrive, TScope>>,
): Array<_CrawlTask<TDrive, TScope>> {
  type CrawlTasks = Array<_CrawlTask<TDrive, TScope>>;
  return resolvedDrives.flatMap((resolved): CrawlTasks => {
    if (!resolved.isResolved) {
      return [
        { isListed: false, driveKey: resolved.driveKey, error: resolved.error },
      ];
    }
    return resolved.scopes.map((scope) => {
      return {
        isListed: true,
        drive: resolved.drive,
        driveKey: resolved.driveKey,
        scope,
      };
    });
  });
}

/**
 * Resolves a drive's id, writing its row the first time the run reaches
 * it. A failed write is not remembered, so the drive's next scope tries
 * again. Resolves to `undefined` when there is no drives store.
 */
function _createDriveIdResolver<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  stores: EtlStores;
}): (drive: TDrive, driveKey: string) => Promise<string | undefined> {
  const idsByDriveKey = new Map<string, string>();
  return async (drive, driveKey) => {
    const { drives } = args.stores;
    if (drives === undefined) {
      return undefined;
    }
    const knownId = idsByDriveKey.get(driveKey);
    if (knownId !== undefined) {
      return knownId;
    }
    const id = await drives.upsert({
      pipelineName: args.config.name,
      driveKey,
      organizationLabels:
        args.config.describeDrive?.(drive).organizationLabels ?? {},
    });
    idsByDriveKey.set(driveKey, id);
    return id;
  };
}

/**
 * The listed task's drive id, or the failed crawl to report when its drive
 * row could not be written. A crawl with no limit left is skipped without
 * writing a drive row, so its id is `undefined`.
 */
async function _resolveDriveIdOrFailure<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope> &
    Readonly<{
      task: Extract<_CrawlTask<TDrive, TScope>, { isListed: true }>;
      remaining: number;
    }>,
): Promise<
  | Readonly<{ driveId: string | undefined }>
  | Readonly<{ failure: CrawlScopeResult }>
> {
  const { task } = args;
  if (args.remaining <= 0) {
    return { driveId: undefined };
  }
  try {
    return { driveId: await args.resolveDriveId(task.drive, task.driveKey) };
  } catch (error: unknown) {
    const failure = buildUncrawledCrawlResult({
      driveKey: task.driveKey,
      scopeKey: task.scope.key,
      options: args.options,
      outcome: { status: "failed", error },
      startedAt: args.clock.now(),
      finishedAt: args.clock.now(),
    });
    return { failure };
  }
}

async function _runCrawlTask<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope> &
    Readonly<{
      task: _CrawlTask<TDrive, TScope>;
      remaining: number;
      progress: RunProgressReporter;
      progressCrawl: ProgressCrawl;
    }>,
): Promise<CrawlScopeResult> {
  const { task, progress, progressCrawl } = args;
  if (!task.isListed) {
    return buildUncrawledCrawlResult({
      driveKey: task.driveKey,
      scopeKey: ETL_UNLISTED_SCOPE_KEY,
      options: args.options,
      outcome: { status: "failed", error: task.error },
      startedAt: args.clock.now(),
      finishedAt: args.clock.now(),
    });
  }
  const resolution = await _resolveDriveIdOrFailure({ ...args, task });
  if ("failure" in resolution) {
    return resolution.failure;
  }
  // A crawl with no limit left is skipped at once, so it only finishes.
  if (args.remaining > 0) {
    progress.crawlStarted(progressCrawl);
  }
  return crawlScope({
    config: args.config,
    drive: task.drive,
    driveKey: task.driveKey,
    driveId: resolution.driveId,
    scope: task.scope,
    options: args.options,
    pipelineRunId: args.pipelineRunId,
    stores: args.stores,
    remaining: args.remaining,
    syncedAt: args.syncedAt,
    clock: args.clock,
    onPageLoaded: (page) => {
      progress.pageLoaded(progressCrawl, page);
    },
    onWriteThrottled: (event) => {
      progress.writeThrottled(progressCrawl, event);
    },
  });
}

/** The crawl a task is, for progress events. */
function _buildProgressCrawl<TDrive, TScope extends EtlScope>(
  task: _CrawlTask<TDrive, TScope>,
  crawlNumber: number,
): ProgressCrawl {
  return {
    driveKey: task.driveKey,
    scopeKey: task.isListed ? task.scope.key : ETL_UNLISTED_SCOPE_KEY,
    crawlNumber,
  };
}

async function _crawlInOrder<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope>,
): Promise<readonly CrawlScopeResult[]> {
  const limit = args.options.limit ?? Number.POSITIVE_INFINITY;
  const progress = createRunProgressReporter({
    onProgress: args.options.onProgress,
    crawlCount: args.tasks.length,
    limit: args.options.limit,
  });
  // Sequential on purpose: crawls run one after another, drive by drive and
  // scope by scope, and each crawl's remaining limit depends on how many
  // connections the crawls before it fetched.
  return promiseReduce<_CrawlTask<TDrive, TScope>, readonly CrawlScopeResult[]>(
    args.tasks,
    async (results, task) => {
      const fetched = results.reduce((sum, { report }) => {
        return sum + report.connectionsFetched;
      }, 0);
      const progressCrawl = _buildProgressCrawl(task, results.length + 1);
      const result = await _runCrawlTask({
        ...args,
        task,
        remaining: limit - fetched,
        progress,
        progressCrawl,
      });
      progress.crawlFinished(progressCrawl, result.report.status);
      // Recorded as each crawl ends, so a long run's progress is visible
      // and a crash keeps the crawls that finished.
      await args.onCrawled(result.report);
      return [...results, result];
    },
    [],
  );
}

function _buildRunReport(args: {
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  results: readonly CrawlScopeResult[];
  startedAt: Date;
  finishedAt: Date;
  setupMs: number;
}): EtlRunReport {
  return {
    pipelineRunId: args.pipelineRunId,
    mode: args.mode,
    crawls: args.results.map((result) => {
      return result.report;
    }),
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    setupMs: args.setupMs,
  };
}

/**
 * @throws EtlRunFailedError, carrying the report, when every crawl failed.
 */
function _throwWhenEveryCrawlFailed(args: {
  report: EtlRunReport;
  results: readonly CrawlScopeResult[];
}): void {
  const { results } = args;
  const isEveryCrawlFailed =
    results.length > 0 &&
    results.every((result) => {
      return result.report.status === "failed";
    });
  if (isEveryCrawlFailed) {
    throw new EtlRunFailedError({
      report: args.report,
      errors: results.map((result) => {
        return result.error;
      }),
    });
  }
}

/**
 * Lists the drives and their scopes, narrowed to the requested scopes.
 *
 * @throws Whatever `listDrives` throws.
 * @throws EtlRunOptionsError when no drive declares a requested scope.
 */
async function _listRequestedDrives<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  options: EtlRunOptions;
}): Promise<ReadonlyArray<ResolvedDrive<TDrive, TScope>>> {
  const { config } = args;
  return selectRequestedScopes({
    pipelineName: config.name,
    resolvedDrives: await resolveDriveScopes({
      config,
      drives: await config.listDrives(),
    }),
    requestedScopeKeys: args.options.scopes,
  });
}

type _RecordedRunArgs<TDrive, TConnection, TScope extends EtlScope> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  options: EtlRunOptions;
  stores: EtlStores;
  clock: EtlClock;
  pipelineRunId: EtlPipelineRunId;
  startedAt: Date;
  execution: RunExecutionRecorder;
}>;

/**
 * Lists drives and scopes, crawls them, and builds the report, recording
 * each crawl as it ends and the run's outcome before resolving or
 * rejecting.
 */
async function _runRecorded<TDrive, TConnection, TScope extends EtlScope>(
  args: _RecordedRunArgs<TDrive, TConnection, TScope>,
): Promise<EtlRunReport> {
  const { config, clock, execution } = args;
  const setupStartMs = clock.monotonicMs();
  let setupMs: number | undefined;
  try {
    const resolvedDrives = await _listRequestedDrives({
      config,
      options: args.options,
    });
    setupMs = Math.round(clock.monotonicMs() - setupStartMs);
    const results = await _crawlInOrder({
      config,
      tasks: _buildCrawlTasks(resolvedDrives),
      options: args.options,
      pipelineRunId: args.pipelineRunId,
      stores: args.stores,
      syncedAt: args.startedAt,
      clock,
      resolveDriveId: _createDriveIdResolver({ config, stores: args.stores }),
      onCrawled: execution.recordCrawl,
    });
    const report = _buildRunReport({
      pipelineRunId: args.pipelineRunId,
      mode: args.options.mode,
      results,
      startedAt: args.startedAt,
      finishedAt: clock.now(),
      setupMs,
    });
    await execution.finishWithReport(report);
    _throwWhenEveryCrawlFailed({ report, results });
    return report;
  } catch (error: unknown) {
    // A no-op when the report was already recorded.
    // A run that failed while listing drives or scopes spent all of its
    // time so far on setup.
    await execution.finishWithError({
      error,
      finishedAt: clock.now(),
      setupMs: setupMs ?? Math.round(clock.monotonicMs() - setupStartMs),
    });
    throw error;
  }
}

async function _listLiveScopes<TDrive, TConnection, TScope extends EtlScope>(
  config: EtlEngineConfig<TDrive, TConnection, TScope>,
): Promise<readonly EtlDriveScopes[]> {
  const resolvedDrives = await resolveDriveScopes({
    config,
    drives: await config.listDrives(),
  });
  return resolvedDrives.map((resolved) => {
    if (!resolved.isResolved) {
      throw new Error(
        `The ${config.name} pipeline could not list the scopes of drive ${resolved.driveKey}.`,
        { cause: resolved.error },
      );
    }
    return {
      driveKey: resolved.driveKey,
      scopeKeys: resolved.scopes.map((scope) => {
        return scope.key;
      }),
    };
  });
}

/**
 * Creates one pipeline's engine. `run()` crawls every scope of every drive,
 * in `listDrives` and then `listScopes` order, one page at a time, and loads
 * each page into the configured listings table and bucket before fetching
 * the next. A failed crawl is reported and the next one still runs.
 * Each run with an invocation and an execution store is recorded: its
 * start, each crawl as it ends, and its outcome. Recording never fails a
 * run.
 * `EtlEngineInstance` lists when `run()` and `listScopes()` reject. See the
 * package README for the output contract and run modes.
 *
 * @param config - The pipeline's drives, scopes, extract, transform, and
 * output.
 * @returns The engine.
 */
export function createEtlEngine<
  TDrive,
  TConnection,
  TScope extends EtlScope = EtlScope,
>(config: EtlEngineConfig<TDrive, TConnection, TScope>): EtlEngineInstance {
  return {
    run: async (options) => {
      _assertCanRun({ config, options });
      const stores = _resolveStores(config);
      const clock = config.clock ?? SYSTEM_CLOCK;
      const pipelineRunId = randomUUID() as EtlPipelineRunId;
      const startedAt = clock.now();
      const execution = createRunExecutionRecorder({
        store: stores.executions,
        pipelineName: config.name,
        pipelineRunId,
        options,
        startedAt,
      });
      await execution.start();
      return _runRecorded({
        config,
        options,
        stores,
        clock,
        pipelineRunId,
        startedAt,
        execution,
      });
    },
    listScopes: () => {
      return _listLiveScopes(config);
    },
  };
}
