import { randomUUID } from "node:crypto";
import { promiseReduce } from "@avandar/utils";
import { crawlDrive } from "@etl/EtlEngine/crawlDrive/crawlDrive";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createSupabaseObjectStore } from "@etl/stores/SupabaseObjectStore/createSupabaseObjectStore";
import { createClient } from "@supabase/supabase-js";
import type {
  EtlDestination,
  EtlDriveReport,
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
  if (
    args.options.mode === "incremental" &&
    args.config.incremental === undefined
  ) {
    throw new Error(
      `The ${args.config.name} pipeline does not support incremental runs.`,
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

function _buildSkippedReport(args: {
  driveKey: string;
  options: EtlRunOptions;
}): EtlDriveReport {
  return {
    driveKey: args.driveKey,
    window: { since: args.options.since, until: args.options.until },
    connectionsFetched: 0,
    relationsWritten: 0,
    relationsUnchanged: 0,
    newestTimestamp: undefined,
    status: "skipped",
  };
}

async function _crawlDrivesInOrder<TDrive, TConnection>(
  args: _CrawlDrivesArgs<TDrive, TConnection>,
): Promise<readonly EtlDriveReport[]> {
  const { config, options } = args;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  // Sequential on purpose: drives are crawled one after another in
  // listDrives order, and each drive's remaining limit depends on how many
  // connections the drives before it fetched.
  return promiseReduce<TDrive, readonly EtlDriveReport[]>(
    args.drives,
    async (reports, drive) => {
      const fetched = reports.reduce((sum, report) => {
        return sum + report.connectionsFetched;
      }, 0);
      const remaining = limit - fetched;
      const report =
        remaining <= 0
          ? _buildSkippedReport({
              driveKey: config.getDriveKey(drive),
              options,
            })
          : await crawlDrive({
              config,
              drive,
              options,
              pipelineRunId: args.pipelineRunId,
              stores: args.stores,
              remaining,
              syncedAt: args.syncedAt,
            });
      return [...reports, report];
    },
    [],
  );
}

/**
 * Creates one pipeline's engine. `run()` crawls every drive in
 * `listDrives` order, one page at a time, and loads each page into the
 * configured listings table and bucket before fetching the next. A failed
 * drive is reported and the next drive still runs. `run()` rejects with
 * `EtlRunFailedError` only when every drive failed. See the package README
 * for the output contract and run modes.
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
      const driveReports = await _crawlDrivesInOrder({
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
        drives: driveReports,
      };
      const isEveryDriveFailed =
        driveReports.length > 0 &&
        driveReports.every((drive) => {
          return drive.status === "failed";
        });
      if (isEveryDriveFailed) {
        throw new EtlRunFailedError(report);
      }
      return report;
    },
  };
}
