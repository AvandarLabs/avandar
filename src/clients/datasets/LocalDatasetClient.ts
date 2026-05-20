import { BackgroundJobs } from "@background-jobs";
import { notifyWarning } from "@ui";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";
import { sniffXlsxFile } from "@/clients/datasets/xlsxSniff";
import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { LocalDatasetParsers } from "@/models/LocalDataset/LocalDatasetParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  LocalDataset,
  LocalDatasetCsvParseOptions,
  LocalDatasetXlsxParseOptions,
} from "@/models/LocalDataset/LocalDataset.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * A client for managing datasets in local storage and in local memory.
 *
 * Datasets cached locally as parquet are tracked here. The CSV / XLSX
 * import flow is two-phase:
 *
 *   - **Phase A** (`startCsvImport` / `startXlsxImport`) — runs the
 *     fast sniff + 200-row preview so the import form can render
 *     immediately, inserts a LocalDataset row with `parseStatus="parsing"`,
 *     optionally caches the source bytes for resume-after-refresh, and
 *     kicks off Phase B in the background.
 *
 *   - **Phase B** (`_runPhaseB`) — the heavy `read_csv` / `read_xlsx` →
 *     parquet transcode. Completion writes the parquet bytes into the row,
 *     drops the cached source bytes, flips `parseStatus="ready"`, and
 *     reconciles column types against the Supabase Dataset record.
 *
 * "Local storage" = browser IndexedDB. "Local memory" = the loaded view in
 * the in-browser DuckDB worker.
 */

/**
 * Per-file ceiling for the source-bytes cache. Files above this don't
 * get their original bytes cached; if the user closes the tab mid-Phase-B
 * we'll prompt for a re-upload instead.
 */
const SOURCE_CACHE_PER_FILE_MAX_BYTES = 200 * 1024 * 1024;

/**
 * Cumulative cap across every LocalDataset row's `sourceBytes`. When a
 * new cache write would push us over this, the LRU evictor frees room by
 * dropping the oldest `lastSourceAccessedAt` entries until we fit.
 */
const SOURCE_CACHE_TOTAL_MAX_BYTES = 1024 * 1024 * 1024;

const PREVIEW_ROW_COUNT = 200;

/**
 * Drop source-bytes entries (oldest first by `lastSourceAccessedAt`) until
 * the running total + `reservedBytes` is under
 * `SOURCE_CACHE_TOTAL_MAX_BYTES`. Idempotent and safe to call before any
 * cache write.
 */
async function _evictSourceCache(reservedBytes: number): Promise<void> {
  const rows = (await AvaDexie.DB.LocalDataset.toArray()).filter((r) => {
    return r.sourceBytes !== undefined;
  });
  let total = rows.reduce((sum, r) => {
    return sum + (r.sourceBytes?.size ?? 0);
  }, 0);

  rows.sort((a, b) => {
    return (a.lastSourceAccessedAt ?? 0) - (b.lastSourceAccessedAt ?? 0);
  });

  while (total + reservedBytes > SOURCE_CACHE_TOTAL_MAX_BYTES && rows.length) {
    const victim = rows.shift();
    if (!victim || !victim.sourceBytes) {
      break;
    }
    const freed = victim.sourceBytes.size;
    await AvaDexie.DB.LocalDataset.update(victim.datasetId, {
      sourceBytes: undefined,
      sourceFileName: undefined,
      sourceFileType: undefined,
      lastSourceAccessedAt: undefined,
    });
    total -= freed;
  }
}

/**
 * Returns the source File / Blob iff caching is permitted for this size
 * (and after evicting older entries to make room).
 */
async function _maybeCacheSourceBytes(file: File): Promise<Blob | undefined> {
  if (file.size > SOURCE_CACHE_PER_FILE_MAX_BYTES) {
    return undefined;
  }
  await _evictSourceCache(file.size);
  return file;
}

/**
 * Reconciles Phase B's authoritative column schema against the Dataset's
 * stored `detectedDataType`. For each name-matched column whose detected
 * type changed, we update the Supabase row + tally for the warning toast.
 *
 * We intentionally only touch `detectedDataType` (not `dataType`) so user
 * overrides of the queryable type are preserved.
 */
async function _reconcileColumns(params: {
  datasetId: DatasetId;
  phaseBColumns: DuckDbColumnSchema[];
}): Promise<{ changedCount: number }> {
  // Lazy import to avoid a circular module load — these clients pull in
  // LocalDatasetClient transitively for cloud-fetch fallbacks.
  const { DatasetClient } = await import("@/clients/datasets/DatasetClient");
  const { DatasetColumnClient } =
    await import("@/clients/datasets/DatasetColumnClient");

  let existingDataset;
  try {
    existingDataset = await DatasetClient.getOne({
      where: { id: { eq: params.datasetId } },
    });
  } catch {
    // Dataset hasn't been saved yet (user hasn't submitted the import form).
    // Nothing to reconcile against; Dataset creation will pick up the
    // Phase B schema directly from the load result.
    return { changedCount: 0 };
  }
  if (!existingDataset) {
    return { changedCount: 0 };
  }

  let existingColumns;
  try {
    existingColumns = await DatasetColumnClient.getAll({
      where: { dataset_id: { eq: params.datasetId } },
    });
  } catch {
    return { changedCount: 0 };
  }

  if (!existingColumns || existingColumns.length === 0) {
    return { changedCount: 0 };
  }

  const byName = new Map<string, (typeof existingColumns)[number]>();
  for (const col of existingColumns) {
    byName.set(col.originalName, col);
  }

  let changedCount = 0;
  for (const detected of params.phaseBColumns) {
    const existing = byName.get(detected.column_name);
    if (!existing) {
      continue;
    }
    if (existing.detectedDataType !== detected.column_type) {
      try {
        await DatasetColumnClient.update({
          id: existing.id,
          data: { detectedDataType: detected.column_type },
        });
        changedCount += 1;
      } catch {
        // Best-effort — surface the discrepancy via the toast even if the
        // write fails.
        changedCount += 1;
      }
    }
  }

  return { changedCount };
}

/**
 * The internal Phase B engine. Updates the LocalDataset row through its
 * parsing → ready lifecycle, drives the DuckDB transcode, reconciles
 * columns, and emits the success / failure toast. Always swallows its
 * own errors (they're surfaced via the toast + `parseStatus="failed"`).
 *
 * Resolves with the final load result on success, or throws on failure.
 */
async function _runPhaseB(params: {
  datasetId: DatasetId;
  workspaceId: Workspace.Id;
  userId: UserId;
  source:
    | { kind: "csv"; file: File; options: LocalDatasetCsvParseOptions }
    | { kind: "xlsx"; file: File; options: LocalDatasetXlsxParseOptions };
}): Promise<DuckDbLoadCsvResult | DuckDbLoadXlsxResult> {
  const { datasetId } = params;
  const startedAt = Date.now();
  const sourceFileSize = params.source.file.size;
  const sourceFileName = params.source.file.name;

  await AvaDexie.DB.LocalDataset.update(datasetId, {
    parseStatus: "parsing",
    parseStartedAt: startedAt,
    parseFailedReason: undefined,
  });
  ImportJobsManager.startJob({ datasetId, sourceFileSize, startedAt });

  // Background-jobs registration so the job appears in the
  // "Show background jobs" modal and so terminal toasts are surfaced
  // by the jobs architecture rather than inline notify calls.
  const backgroundJob = BackgroundJobs.register({
    id: `dataset-parse:${datasetId}`,
    type: "dataset-parse",
    label: `Importing "${sourceFileName}"`,
    description: "Transcoding source file to parquet",
    metadata: { datasetId, sourceFileSize },
    successToast: {
      title: "Dataset ready",
      message: `"${sourceFileName}" finished processing and is ready to use.`,
    },
    failureToast: {
      title: "Dataset failed to process",
      message: `"${sourceFileName}" could not be parsed.`,
    },
  });

  try {
    const result =
      params.source.kind === "csv" ?
        await DuckDbClient.loadCsv({
          tableName: datasetId,
          file: params.source.file,
          numRowsToSkip: params.source.options.numRowsToSkip,
          delimiter: params.source.options.delimiter,
        })
      : await DuckDbClient.loadXlsx({
          tableName: datasetId,
          file: params.source.file,
          sheet: params.source.options.sheet,
          hasHeader: params.source.options.hasHeader,
        });

    await AvaDexie.DB.LocalDataset.update(datasetId, {
      parquetData: result.parquetData,
      parseStatus: "ready",
      parseFailedReason: undefined,
      // Drop the cached source bytes now that the parquet has landed —
      // we no longer need them for resume.
      sourceBytes: undefined,
      lastSourceAccessedAt: undefined,
    });

    const { changedCount } = await _reconcileColumns({
      datasetId,
      phaseBColumns: result.columns,
    });

    ImportJobsManager.markSucceeded(datasetId);
    BackgroundJobs.markCompleted(backgroundJob.id);

    if (changedCount > 0) {
      notifyWarning({
        title: "Column types updated",
        message: `Detected column types for ${changedCount} ${
          changedCount === 1 ? "column" : "columns"
        } in "${sourceFileName}" differed from the import preview and have been overwritten with the actual values.`,
      });
    }

    // Hold the terminal job entry for a tick so the upload coordinator
    // (which awaits `waitForCompletion`) can observe success before the
    // entry disappears.
    setTimeout(() => {
      ImportJobsManager.clearJob(datasetId);
    }, 2000);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await AvaDexie.DB.LocalDataset.update(datasetId, {
      parseStatus: "failed",
      parseFailedReason: message,
    });
    ImportJobsManager.markFailed(datasetId, message);
    BackgroundJobs.markFailed(backgroundJob.id, message);
    setTimeout(() => {
      ImportJobsManager.clearJob(datasetId);
    }, 2000);
    throw err;
  }
}

export const LocalDatasetClient = createUsableServiceClient(
  createDexieCrudClient({
    db: AvaDexie.DB,
    modelName: "LocalDataset",
    parsers: LocalDatasetParsers,
    mutations: (config) => {
      const downloadsInProgressByDatasetId: Map<
        DatasetId,
        Promise<LocalDataset | undefined>
      > = new Map();

      return {
        /**
         * Phase A for CSV imports. Synchronously runs the DuckDB sniff +
         * 200-row preview so the caller can render the import form, then
         * fires Phase B in the background. Promise resolves as soon as
         * Phase A is done — callers do not need to await Phase B.
         */
        startCsvImport: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          userId: UserId;
          file: File;
          parseOptions: Omit<LocalDatasetCsvParseOptions, "type">;
        }): Promise<{
          csvSniff: DuckDbCsvSniffResult;
          columns: DuckDbColumnSchema[];
          previewRows: UnknownRow[];
        }> => {
          const logger = config.logger.appendName("startCsvImport");
          const { datasetId, workspaceId, userId, file, parseOptions } = params;
          logger.log("Starting CSV import (Phase A)", {
            datasetId,
            size: file.size,
          });

          const sniff = await DuckDbClient.sniffCsv({
            file,
            numRowsToSkip: parseOptions.numRowsToSkip,
            delimiter: parseOptions.delimiter,
            maxPreviewRows: PREVIEW_ROW_COUNT,
          });

          const cachedBytes = await _maybeCacheSourceBytes(file);
          await AvaDexie.DB.LocalDataset.put({
            datasetId,
            workspaceId,
            userId,
            parquetData: undefined,
            parseStatus: "parsing",
            parseStartedAt: Date.now(),
            parseFailedReason: undefined,
            sourceBytes: cachedBytes,
            sourceFileName: file.name,
            sourceFileType: "csv",
            sourceFileSize: file.size,
            lastSourceAccessedAt: cachedBytes ? Date.now() : undefined,
            parseOptions: { type: "csv", ...parseOptions },
          });

          // Kick off Phase B. We deliberately don't await — Phase A
          // already returned everything the import form needs. The
          // promise's rejection is handled inside `_runPhaseB`, so the
          // unhandled-promise hazard doesn't apply here.
          void _runPhaseB({
            datasetId,
            workspaceId,
            userId,
            source: {
              kind: "csv",
              file,
              options: { type: "csv", ...parseOptions },
            },
          });

          return sniff;
        },

        /**
         * Phase A for XLSX imports. Mirrors `startCsvImport` but uses a
         * SheetJS-backed sniff worker (off-main-thread) since DuckDB
         * `read_xlsx` does not support partial / streaming sniffs.
         */
        startXlsxImport: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          userId: UserId;
          file: File;
          parseOptions: Omit<LocalDatasetXlsxParseOptions, "type">;
        }): Promise<{
          sheets: string[];
          defaultSheet: string;
          columns: string[];
          previewRows: Array<Record<string, unknown>>;
        }> => {
          const logger = config.logger.appendName("startXlsxImport");
          const { datasetId, workspaceId, userId, file, parseOptions } = params;
          logger.log("Starting XLSX import (Phase A)", {
            datasetId,
            size: file.size,
          });

          const sniff = await sniffXlsxFile({
            file,
            sheet: parseOptions.sheet,
            hasHeader: parseOptions.hasHeader,
            maxPreviewRows: PREVIEW_ROW_COUNT,
          });

          const cachedBytes = await _maybeCacheSourceBytes(file);
          await AvaDexie.DB.LocalDataset.put({
            datasetId,
            workspaceId,
            userId,
            parquetData: undefined,
            parseStatus: "parsing",
            parseStartedAt: Date.now(),
            parseFailedReason: undefined,
            sourceBytes: cachedBytes,
            sourceFileName: file.name,
            sourceFileType: "xlsx",
            sourceFileSize: file.size,
            lastSourceAccessedAt: cachedBytes ? Date.now() : undefined,
            parseOptions: {
              type: "xlsx",
              sheet: parseOptions.sheet ?? sniff.defaultSheet,
              hasHeader: parseOptions.hasHeader,
            },
          });

          void _runPhaseB({
            datasetId,
            workspaceId,
            userId,
            source: {
              kind: "xlsx",
              file,
              options: {
                type: "xlsx",
                sheet: parseOptions.sheet ?? sniff.defaultSheet,
                hasHeader: parseOptions.hasHeader,
              },
            },
          });

          return sniff;
        },

        /**
         * Resume a previously-stalled Phase B from the row's cached
         * source bytes. Returns the load result if resume is possible;
         * resolves with `undefined` if the source bytes were evicted /
         * never cached (the UI should then prompt the user to re-upload).
         */
        resumeImport: async (params: {
          datasetId: DatasetId;
        }): Promise<DuckDbLoadCsvResult | DuckDbLoadXlsxResult | undefined> => {
          const logger = config.logger.appendName("resumeImport");
          const row = await AvaDexie.DB.LocalDataset.get(params.datasetId);
          if (!row) {
            return undefined;
          }
          if (!row.sourceBytes || !row.sourceFileType || !row.parseOptions) {
            logger.log("Cannot resume — no cached source bytes", {
              datasetId: params.datasetId,
            });
            return undefined;
          }
          await AvaDexie.DB.LocalDataset.update(params.datasetId, {
            lastSourceAccessedAt: Date.now(),
          });

          // Re-construct a File from the cached Blob so the rest of the
          // pipeline (which expects a File for the `.name` etc.) works
          // unchanged.
          const file = new File(
            [row.sourceBytes],
            row.sourceFileName ?? `${row.datasetId}.${row.sourceFileType}`,
            { type: row.sourceBytes.type },
          );

          if (row.sourceFileType === "csv") {
            const options = row.parseOptions as LocalDatasetCsvParseOptions;
            return _runPhaseB({
              datasetId: row.datasetId,
              workspaceId: row.workspaceId,
              userId: row.userId,
              source: { kind: "csv", file, options },
            });
          }
          const options = row.parseOptions as LocalDatasetXlsxParseOptions;
          return _runPhaseB({
            datasetId: row.datasetId,
            workspaceId: row.workspaceId,
            userId: row.userId,
            source: { kind: "xlsx", file, options },
          });
        },

        /**
         * Drops the local dataset from both local storage (IndexedDb) and
         * memory (DuckDb).
         */
        dropLocalDataset: async (params: {
          datasetId: DatasetId;
        }): Promise<void> => {
          const logger = config.logger.appendName("dropLocalDataset");
          logger.log("Dropping local dataset", params);
          const { datasetId } = params;
          await LocalDatasetClient.delete({ id: datasetId });
          await DuckDbClient.dropTableViewAndFile(datasetId);
        },

        /**
         * Fetch a parquet dataset from cloud object storage and store it
         * locally. Always lands in `parseStatus="ready"` (the cloud copy
         * is already a parquet).
         */
        fetchCloudDatasetToLocalStorage: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          userId: UserId;
        }): Promise<LocalDataset | undefined> => {
          const existingPromise = downloadsInProgressByDatasetId.get(
            params.datasetId,
          );
          if (existingPromise) {
            return await existingPromise;
          }

          const downloadPromise = (async () => {
            const { datasetId, workspaceId, userId } = params;
            const logger = config.logger.appendName(
              "fetchCloudDatasetToLocalStorage",
            );
            logger.log("Fetching cloud dataset to local storage", params);
            const parquetBlob =
              await DatasetParquetStorageClient.downloadDataset({
                datasetId,
                workspaceId,
              });

            if (!parquetBlob) {
              return undefined;
            }

            return await LocalDatasetClient.insert({
              data: {
                datasetId,
                workspaceId,
                userId,
                parquetData: parquetBlob,
                parseStatus: "ready",
                parseStartedAt: undefined,
                parseFailedReason: undefined,
                sourceBytes: undefined,
                sourceFileName: undefined,
                sourceFileType: undefined,
                sourceFileSize: undefined,
                lastSourceAccessedAt: undefined,
                parseOptions: undefined,
              },
            });
          })().finally(() => {
            downloadsInProgressByDatasetId.delete(params.datasetId);
          });

          downloadsInProgressByDatasetId.set(params.datasetId, downloadPromise);
          return await downloadPromise;
        },
      };
    },
  }),
  {
    mutationFns: [
      "startCsvImport",
      "startXlsxImport",
      "resumeImport",
      "dropLocalDataset",
      "fetchCloudDatasetToLocalStorage",
    ],
  },
);
