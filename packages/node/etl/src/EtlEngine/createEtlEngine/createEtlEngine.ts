import { randomUUID } from "node:crypto";
import { promiseReduce } from "@avandar/utils";
import { crawlDrive } from "@etl/EtlEngine/crawlDrive/crawlDrive";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import type { CrawlDriveResult } from "@etl/EtlEngine/crawlDrive/crawlDrive";
import type {
  EtlDestination,
  EtlEngineConfig,
  EtlEngineInstance,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunReport,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";

type _CrawlDrivesArgs<TDrive, TConnection> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection>;
  drives: readonly TDrive[];
  options: EtlRunOptions;
  pipelineRunId: EtlPipelineRunId;
  stores: EtlStores;
  syncedAt: Date;
}>;

function _assertCanRun<TDrive, TConnection>(args: {
  config: EtlEngineConfig<TDrive, TConnection>;
  options: EtlRunOptions;
}): void {
  const { config, options } = args;
  if (options.mode === "incremental" && config.incremental === undefined) {
    throw new Error(
      `The ${config.name} pipeline does not support incremental runs.`,
    );
  }
  const { limit } = options;
  if (limit !== undefined && !(Number.isInteger(limit) && limit >= 0)) {
    throw new Error(
      `The ${config.name} pipeline got a limit of ${limit}, but a limit must be an integer of 0 or more.`,
    );
  }
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
  };
}

async function _crawlDrivesInOrder<TDrive, TConnection>(
  args: _CrawlDrivesArgs<TDrive, TConnection>,
): Promise<readonly CrawlDriveResult[]> {
  const limit = args.options.limit ?? Number.POSITIVE_INFINITY;
  // Sequential on purpose: drives are crawled one after another in
  // listDrives order, and each drive's remaining limit depends on how many
  // connections the drives before it fetched.
  return promiseReduce<TDrive, readonly CrawlDriveResult[]>(
    args.drives,
    async (results, drive, driveIndex) => {
      const fetched = results.reduce((sum, { report }) => {
        return sum + report.connectionsFetched;
      }, 0);
      const result = await crawlDrive({
        config: args.config,
        drive,
        driveIndex,
        options: args.options,
        pipelineRunId: args.pipelineRunId,
        stores: args.stores,
        remaining: limit - fetched,
        syncedAt: args.syncedAt,
      });
      return [...results, result];
    },
    [],
  );
}

/**
 * Creates one pipeline's engine. `run()` crawls every drive in
 * `listDrives` order, one page at a time, and loads each page into the
 * configured listings table and bucket before fetching the next. A failed
 * drive is reported and the next drive still runs. `EtlEngineInstance.run`
 * lists when `run()` rejects. See the package README for the output contract
 * and run modes.
 *
 * @param config - The pipeline's drives, extract, transform, and output.
 * @returns The engine.
 */
export function createEtlEngine<TDrive, TConnection>(
  config: EtlEngineConfig<TDrive, TConnection>,
): EtlEngineInstance {
  return {
    run: async (options) => {
      _assertCanRun({ config, options });
      const stores = config.stores ?? _createSupabaseStores(config);
      const pipelineRunId = randomUUID() as EtlPipelineRunId;
      const drives = await config.listDrives();
      const results = await _crawlDrivesInOrder({
        config,
        drives,
        options,
        pipelineRunId,
        stores,
        syncedAt: new Date(),
      });
      const report: EtlRunReport = {
        pipelineRunId,
        mode: options.mode,
        drives: results.map((result) => {
          return result.report;
        }),
      };
      const isEveryDriveFailed =
        results.length > 0 &&
        results.every((result) => {
          return result.report.status === "failed";
        });
      if (isEveryDriveFailed) {
        throw new EtlRunFailedError({
          report,
          errors: results.map((result) => {
            return result.error;
          }),
        });
      }
      return report;
    },
  };
}
