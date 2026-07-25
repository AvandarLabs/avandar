import { runBackgroundParquetTranscoding } from "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding";
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
 * import runs in two named phases:
 *
 *   - The sniff phase (`startCsvImport` / `startXlsxImport`) runs the fast
 *     sniff + 200-row preview so the import form can render immediately,
 *     inserts a LocalDataset row with `parseStatus="parsing"`, optionally
 *     caches the source bytes for resume-after-refresh, and kicks off the
 *     background parquet transcoding.
 *
 *   - The background parquet transcoding (`runBackgroundParquetTranscoding`)
 *     is the heavy `read_csv` / `read_xlsx` → parquet step that runs after
 *     the sniff phase. Completion writes the parquet bytes into the row,
 *     drops the cached source bytes, flips `parseStatus="ready"`, and
 *     reconciles column types against the Supabase Dataset record.
 *
 * "Local storage" = browser IndexedDB. "Local memory" = the loaded view in
 * the in-browser DuckDB worker.
 */

/**
 * Per-file ceiling for the source-bytes cache. Files above this don't
 * get their original bytes cached; if the user closes the tab while the
 * background parquet transcoding is still running we'll prompt for a
 * re-upload instead.
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
         * The sniff phase for CSV imports. Synchronously runs the DuckDB
         * sniff + 200-row preview so the caller can render the import form,
         * then fires the background parquet transcoding. Promise resolves as
         * soon as the sniff phase is done; callers do not need to await the
         * background parquet transcoding.
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
          logger.log("Starting CSV import (sniff phase)", {
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

          // Kick off the background parquet transcoding. We deliberately
          // don't await; the sniff phase already returned everything the
          // import form needs. The promise's rejection is handled inside
          // `runBackgroundParquetTranscoding`, so the unhandled-promise
          // hazard doesn't apply here.
          void runBackgroundParquetTranscoding({
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
         * The sniff phase for XLSX imports. Mirrors `startCsvImport` but
         * uses a SheetJS-backed sniff worker (off-main-thread) since DuckDB
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
          logger.log("Starting XLSX import (sniff phase)", {
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

          void runBackgroundParquetTranscoding({
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
         * Resume a previously-stalled background parquet transcoding from
         * the row's cached source bytes. Returns the load result if resume is
         * possible; resolves with `undefined` if the source bytes were
         * evicted / never cached (the UI should then prompt the user to
         * re-upload).
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
            logger.log("Cannot resume: no cached source bytes", {
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
            return runBackgroundParquetTranscoding({
              datasetId: row.datasetId,
              workspaceId: row.workspaceId,
              userId: row.userId,
              source: { kind: "csv", file, options },
            });
          }
          const options = row.parseOptions as LocalDatasetXlsxParseOptions;
          return runBackgroundParquetTranscoding({
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
