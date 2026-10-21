import { randomUUID } from "node:crypto";
import { promiseReduce } from "@avandar/utils";
import {
  buildUncrawledCrawlResult,
  crawlScope,
} from "@etl/EtlEngine/crawlScope/crawlScope";
import {
  ETL_SCOPE_KEY_PATTERN,
  ETL_UNLISTED_SCOPE_KEY,
} from "@etl/EtlEngine/etlScopes";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import { resolveDriveScopes } from "@etl/EtlEngine/resolveDriveScopes/resolveDriveScopes";
import { selectRequestedScopes } from "@etl/EtlEngine/selectRequestedScopes/selectRequestedScopes";
import { createSupabaseCheckpointStore } from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import type { CrawlScopeResult } from "@etl/EtlEngine/crawlScope/crawlScope";
import type {
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
      relationColumnsTable: output.relationColumnsTable,
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

async function _runCrawlTask<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope> &
    Readonly<{ task: _CrawlTask<TDrive, TScope>; remaining: number }>,
): Promise<CrawlScopeResult> {
  const { task } = args;
  if (!task.isListed) {
    return buildUncrawledCrawlResult({
      driveKey: task.driveKey,
      scopeKey: ETL_UNLISTED_SCOPE_KEY,
      options: args.options,
      outcome: { status: "failed", error: task.error },
    });
  }
  return crawlScope({
    config: args.config,
    drive: task.drive,
    driveKey: task.driveKey,
    scope: task.scope,
    options: args.options,
    pipelineRunId: args.pipelineRunId,
    stores: args.stores,
    remaining: args.remaining,
    syncedAt: args.syncedAt,
  });
}

async function _crawlInOrder<TDrive, TConnection, TScope extends EtlScope>(
  args: _CrawlTasksArgs<TDrive, TConnection, TScope>,
): Promise<readonly CrawlScopeResult[]> {
  const limit = args.options.limit ?? Number.POSITIVE_INFINITY;
  // Sequential on purpose: crawls run one after another, drive by drive and
  // scope by scope, and each crawl's remaining limit depends on how many
  // connections the crawls before it fetched.
  return promiseReduce<_CrawlTask<TDrive, TScope>, readonly CrawlScopeResult[]>(
    args.tasks,
    async (results, task) => {
      const fetched = results.reduce((sum, { report }) => {
        return sum + report.connectionsFetched;
      }, 0);
      const result = await _runCrawlTask({
        ...args,
        task,
        remaining: limit - fetched,
      });
      return [...results, result];
    },
    [],
  );
}

/**
 * Builds the run's report.
 *
 * @throws EtlRunFailedError, carrying the report, when every crawl failed.
 */
function _finishRun(args: {
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  results: readonly CrawlScopeResult[];
}): EtlRunReport {
  const { results } = args;
  const report: EtlRunReport = {
    pipelineRunId: args.pipelineRunId,
    mode: args.mode,
    crawls: results.map((result) => {
      return result.report;
    }),
  };
  const isEveryCrawlFailed =
    results.length > 0 &&
    results.every((result) => {
      return result.report.status === "failed";
    });
  if (isEveryCrawlFailed) {
    throw new EtlRunFailedError({
      report,
      errors: results.map((result) => {
        return result.error;
      }),
    });
  }
  return report;
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
      const pipelineRunId = randomUUID() as EtlPipelineRunId;
      const resolvedDrives = selectRequestedScopes({
        pipelineName: config.name,
        resolvedDrives: await resolveDriveScopes({
          config,
          drives: await config.listDrives(),
        }),
        requestedScopeKeys: options.scopes,
      });
      const results = await _crawlInOrder({
        config,
        tasks: _buildCrawlTasks(resolvedDrives),
        options,
        pipelineRunId,
        stores,
        syncedAt: new Date(),
      });
      return _finishRun({ pipelineRunId, mode: options.mode, results });
    },
    listScopes: () => {
      return _listLiveScopes(config);
    },
  };
}
