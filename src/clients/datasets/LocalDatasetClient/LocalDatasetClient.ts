import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/DatasetSource";
import { match } from "ts-pattern";
import { runBackgroundParquetTranscoding } from "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding";
import { sniffPdfFile } from "@/clients/datasets/pdfSniff";
import { sniffXlsxFile } from "@/clients/datasets/xlsxSniff";
import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { getDatasetSourceTypeFromSourceFileType } from "@/models/LocalDataset/getDatasetSourceTypeFromSourceFileType/getDatasetSourceTypeFromSourceFileType";
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
  LocalDatasetPdfParseOptions,
  LocalDatasetSourceFileType,
  LocalDatasetXlsxParseOptions,
} from "@/models/LocalDataset/LocalDataset.types";
import type { PdfSniffResult } from "@/workers/pdfSniff.worker/pdfSniff.worker";
import type { ILogger } from "@avandar/logger";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Per-file ceiling for the source-bytes cache. Files above this don't
 * get their original bytes cached; if the user closes the tab while the
 * background parquet transcoding is still running we'll prompt for a
 * re-upload instead.
 *
 * Sources that require original-file retention are exempt. See
 * {@link _maybeCacheSourceBytes}.
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
 *
 * Pinned rows (`isSourcePinned`) still count toward the running total, since
 * they genuinely occupy the budget, but are never eviction candidates: for a
 * retained original (e.g. a PDF) these bytes are the only copy in existence.
 * This means a large enough pinned set can leave the total permanently over
 * budget with nothing left to reclaim, so the loop only ever considers the
 * unpinned candidates and ends once they're exhausted.
 */
export async function evictSourceCache(reservedBytes: number): Promise<void> {
  const rows = (await AvaDexie.DB.LocalDataset.toArray()).filter((r) => {
    return r.sourceBytes !== undefined;
  });
  let total = rows.reduce((sum, r) => {
    return sum + (r.sourceBytes?.size ?? 0);
  }, 0);

  const evictionCandidates = rows
    .filter((r) => {
      return !r.isSourcePinned;
    })
    .sort((a, b) => {
      return (a.lastSourceAccessedAt ?? 0) - (b.lastSourceAccessedAt ?? 0);
    });

  while (
    total + reservedBytes > SOURCE_CACHE_TOTAL_MAX_BYTES &&
    evictionCandidates.length
  ) {
    const victim = evictionCandidates.shift();
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
 *
 * `mustRetain` exempts the file from the per-file ceiling, and it is the
 * same condition that pins the row. For CSV and XLSX the cached bytes are a
 * convenience for resuming a parse, so refusing an enormous one costs the
 * user a re-upload at worst and the ceiling is right. For a source that
 * requires retention the bytes are the retained original, the only copy of
 * what extraction is lossy against, and large PDFs are ordinary in this
 * corpus. Applying the ceiling there produced the worst of both: a row
 * pinned as "the original lives here" with nothing in it, whose only symptom
 * was `startOriginalFileUploadIfNeeded` throwing "no original file is cached
 * locally" much later, at save time.
 */
async function _maybeCacheSourceBytes(
  file: File,
  options: Readonly<{ mustRetain: boolean }>,
): Promise<Blob | undefined> {
  if (!options.mustRetain && file.size > SOURCE_CACHE_PER_FILE_MAX_BYTES) {
    return undefined;
  }
  await evictSourceCache(file.size);
  return file;
}

type LocalImportParams<ParseOptions> = {
  datasetId: DatasetId;
  workspaceId: Workspace.Id;
  userId: UserId;
  file: File;
  parseOptions: ParseOptions;
};

type XlsxSniffResult = {
  sheets: string[];
  defaultSheet: string;
  columns: string[];
  previewRows: Array<Record<string, unknown>>;
};

type LocalDatasetMutationContext = {
  logger: ILogger;
  downloads: Map<DatasetId, Promise<LocalDataset | undefined>>;
};

type PutParsingDatasetOptions = LocalImportParams<
  | LocalDatasetCsvParseOptions
  | LocalDatasetXlsxParseOptions
  | LocalDatasetPdfParseOptions
> & { sourceFileType: LocalDatasetSourceFileType };

type LocalDatasetMutationRecord = {
  startCsvImport: (
    params: Readonly<
      LocalImportParams<Omit<LocalDatasetCsvParseOptions, "type">>
    >,
  ) => Promise<{
    csvSniff: DuckDbCsvSniffResult;
    columns: DuckDbColumnSchema[];
    previewRows: UnknownRow[];
  }>;
  startXlsxImport: (
    params: Readonly<
      LocalImportParams<Omit<LocalDatasetXlsxParseOptions, "type">>
    >,
  ) => Promise<XlsxSniffResult>;
  startPdfImport: (
    params: Readonly<
      LocalImportParams<Omit<LocalDatasetPdfParseOptions, "type">>
    >,
  ) => Promise<PdfSniffResult>;
  transcodePdfExtraction: (
    params: Readonly<{
      datasetId: DatasetId;
      workspaceId: Workspace.Id;
      userId: UserId;
      /** The extracted regions, serialised so DuckDB can type them. */
      csvFile: File;
    }>,
  ) => Promise<{
    columns: DuckDbColumnSchema[];
    previewRows: UnknownRow[];
  }>;
  transcodeReviewedPdfExtraction: (
    params: Readonly<{
      datasetId: DatasetId;
      workspaceId: Workspace.Id;
      /** The rows the user approved, serialised so DuckDB can type them. */
      csvFile: File;
    }>,
  ) => Promise<{ columns: DuckDbColumnSchema[] }>;
  resumeImport: (
    params: Readonly<{ datasetId: DatasetId }>,
  ) => Promise<DuckDbLoadCsvResult | DuckDbLoadXlsxResult | undefined>;
  dropLocalDataset: (
    params: Readonly<{ datasetId: DatasetId }>,
  ) => Promise<void>;
  fetchCloudDatasetToLocalStorage: (
    params: Readonly<{
      datasetId: DatasetId;
      workspaceId: Workspace.Id;
      userId: UserId;
    }>,
  ) => Promise<LocalDataset | undefined>;
};

async function _putParsingDataset(
  options: Readonly<PutParsingDatasetOptions>,
): Promise<void> {
  // Derived, never hardcoded: the pin means "these bytes are the retained
  // original", which is a property of the source type alone. CSV and XLSX
  // are reconstructable from parquet + parse options so they come out false
  // here, but a future import path that starts putting rows of a
  // non-reconstructable kind through this function gets the pin for free
  // instead of having to remember it. See `requiresOriginalFileRetention`.
  //
  // The same value decides whether the per-file cache ceiling applies, so a
  // row can never be pinned without the bytes the pin claims to protect.
  const isSourcePinned = requiresOriginalFileRetention(
    getDatasetSourceTypeFromSourceFileType(options.sourceFileType),
  );
  const cachedBytes = await _maybeCacheSourceBytes(options.file, {
    mustRetain: isSourcePinned,
  });
  await AvaDexie.DB.LocalDataset.put({
    datasetId: options.datasetId,
    workspaceId: options.workspaceId,
    userId: options.userId,
    parquetData: undefined,
    parseStatus: "parsing",
    parseStartedAt: Date.now(),
    parseFailedReason: undefined,
    sourceBytes: cachedBytes,
    sourceFileName: options.file.name,
    sourceFileType: options.sourceFileType,
    sourceFileSize: options.file.size,
    lastSourceAccessedAt: cachedBytes ? Date.now() : undefined,
    isSourcePinned,
    parseOptions: options.parseOptions,
  });
}

async function _downloadCloudDataset(
  options: Readonly<{
    logger: ILogger;
    datasetId: DatasetId;
    workspaceId: Workspace.Id;
    userId: UserId;
  }>,
): Promise<LocalDataset | undefined> {
  const { logger: baseLogger, ...params } = options;
  const logger = baseLogger.appendName("fetchCloudDatasetToLocalStorage");
  logger.log("Fetching cloud dataset to local storage", params);
  const parquetData = await DatasetParquetStorageClient.downloadDataset(params);
  return parquetData ?
      LocalDatasetClient.insert({
        data: {
          ...params,
          parquetData,
          parseStatus: "ready",
          parseStartedAt: undefined,
          parseFailedReason: undefined,
          sourceBytes: undefined,
          sourceFileName: undefined,
          sourceFileType: undefined,
          sourceFileSize: undefined,
          lastSourceAccessedAt: undefined,
          isSourcePinned: undefined,
          parseOptions: undefined,
        },
      })
    : undefined;
}

function _makeStartCsvImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["startCsvImport"] {
  return async (params) => {
    const logger = context.logger.appendName("startCsvImport");
    logger.log("Starting CSV import (sniff phase)", {
      datasetId: params.datasetId,
      size: params.file.size,
    });
    const sniff = await DuckDbClient.sniffCsv({
      file: params.file,
      numRowsToSkip: params.parseOptions.numRowsToSkip,
      delimiter: params.parseOptions.delimiter,
      maxPreviewRows: PREVIEW_ROW_COUNT,
    });
    await _putParsingDataset({
      ...params,
      sourceFileType: "csv",
      parseOptions: { type: "csv", ...params.parseOptions },
    });
    void runBackgroundParquetTranscoding({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      source: {
        kind: "csv",
        file: params.file,
        options: { type: "csv", ...params.parseOptions },
      },
    });
    return sniff;
  };
}

function _makeStartXlsxImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["startXlsxImport"] {
  return async (params) => {
    const logger = context.logger.appendName("startXlsxImport");
    logger.log("Starting XLSX import (sniff phase)", {
      datasetId: params.datasetId,
      size: params.file.size,
    });
    const sniff = await sniffXlsxFile({
      file: params.file,
      sheet: params.parseOptions.sheet,
      hasHeader: params.parseOptions.hasHeader,
      maxPreviewRows: PREVIEW_ROW_COUNT,
    });
    const parseOptions = {
      type: "xlsx" as const,
      sheet: params.parseOptions.sheet ?? sniff.defaultSheet,
      hasHeader: params.parseOptions.hasHeader,
    };
    await _putParsingDataset({
      ...params,
      sourceFileType: "xlsx",
      parseOptions,
    });
    void runBackgroundParquetTranscoding({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      source: { kind: "xlsx", file: params.file, options: parseOptions },
    });
    return sniff;
  };
}

/**
 * Reads a PDF's page geometry and stores the file as the retained original.
 *
 * Two things set this apart from the CSV and XLSX paths:
 *
 * - The stored bytes are pinned rather than cached. For a spreadsheet the
 *   original is a short-lived resume cache that the LRU evictor and the
 *   post-transcode cleanup are free to drop; for a PDF it is the only copy of
 *   data that extraction is lossy against, so it has to survive both.
 *   `_putParsingDataset` derives the pin from the source type, so this
 *   function gets it by passing `sourceFileType: "pdf"`.
 * - No background parquet transcoding is started. A PDF has no rows until the
 *   user picks a region, so there is nothing to transcode yet.
 */
function _makeStartPdfImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["startPdfImport"] {
  return async (params) => {
    const logger = context.logger.appendName("startPdfImport");
    logger.log("Storing PDF and reading geometry", {
      datasetId: params.datasetId,
      size: params.file.size,
    });
    const sniff = await sniffPdfFile({
      file: params.file,
      pageRange: params.parseOptions.pageRange,
    });
    await _putParsingDataset({
      ...params,
      sourceFileType: "pdf",
      parseOptions: { type: "pdf", pageRange: params.parseOptions.pageRange },
    });
    return sniff;
  };
}

/**
 * Types and transcodes the rows extracted from a PDF's regions.
 *
 * The extracted table is serialised to CSV first, so DuckDB's sniffer types
 * it exactly as it would a real one and no second type-inference path has to
 * exist for PDFs.
 *
 * Unlike `startCsvImport` this does not call `_putParsingDataset`. That
 * function `put`s a whole row, which would replace the PDF's `sourceBytes`
 * with the throwaway CSV and rewrite `sourceFileType` to `"csv"`, destroying
 * the retained original. The row already exists from `startPdfImport`, and
 * `runBackgroundParquetTranscoding` only ever `update`s it, so the pinned
 * bytes survive both the transcode and the post-transcode clear (which
 * `makeTranscodeCompletionUpdateFromParquet` skips for pinned rows).
 */
function _makeTranscodePdfExtraction(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["transcodePdfExtraction"] {
  return async (params) => {
    const logger = context.logger.appendName("transcodePdfExtraction");
    logger.log("Typing extracted PDF rows", {
      datasetId: params.datasetId,
      size: params.csvFile.size,
    });
    const sniff = await DuckDbClient.sniffCsv({
      file: params.csvFile,
      maxPreviewRows: PREVIEW_ROW_COUNT,
    });
    void runBackgroundParquetTranscoding({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      source: {
        kind: "csv",
        file: params.csvFile,
        options: { type: "csv" },
      },
    });
    return { columns: sniff.columns, previewRows: sniff.previewRows };
  };
}

/**
 * Re-types and re-transcodes a PDF dataset from the rows the user approved.
 *
 * Called once, at save time. The import-time transcode ran against the raw
 * extraction, so after any review correction or model-assisted row the
 * DuckDB table and the parquet still hold the pre-review data. Saving
 * without this would write a dataset whose column metadata described rows
 * the user fixed while its actual rows stayed wrong, which is worse than
 * offering no review at all.
 *
 * Unlike `transcodePdfExtraction` this awaits the transcode instead of
 * firing it off. Two reasons: the caller is about to insert the dataset and
 * wants the authoritative column types the transcode produces, not the
 * sniffer's guess; and `startDatasetUpload` runs moments later and decides
 * what to upload from `parseStatus` plus the import job, so returning before
 * the job is even registered would race it into uploading the stale parquet.
 *
 * `userId` is read from the existing row rather than taken as a parameter.
 * The row was created by `startPdfImport` and already records whose import
 * this is, so there is nothing for a caller to get wrong.
 */
function _makeTranscodeReviewedPdfExtraction(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["transcodeReviewedPdfExtraction"] {
  return async (params) => {
    const logger = context.logger.appendName("transcodeReviewedPdfExtraction");
    logger.log("Re-typing reviewed PDF rows", {
      datasetId: params.datasetId,
      size: params.csvFile.size,
    });
    const row = await AvaDexie.DB.LocalDataset.get(params.datasetId);
    if (!row) {
      throw new Error(
        `Cannot re-transcode ${params.datasetId}: it is no longer in local storage.`,
      );
    }
    const result = await runBackgroundParquetTranscoding({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: row.userId,
      source: { kind: "csv", file: params.csvFile, options: { type: "csv" } },
    });
    return { columns: result.columns };
  };
}

function _makeResumeImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["resumeImport"] {
  return async (params) => {
    const logger = context.logger.appendName("resumeImport");
    const row = await AvaDexie.DB.LocalDataset.get(params.datasetId);
    if (!row?.sourceBytes || !row.sourceFileType || !row.parseOptions) {
      logger.log("Cannot resume: no cached source bytes", params);
      return undefined;
    }
    const sourceFileType = row.sourceFileType;
    await AvaDexie.DB.LocalDataset.update(params.datasetId, {
      lastSourceAccessedAt: Date.now(),
    });
    const file = new File(
      [row.sourceBytes],
      row.sourceFileName ?? `${row.datasetId}.${sourceFileType}`,
      { type: row.sourceBytes.type },
    );
    // Exhaustive on purpose. The previous ternary sent anything that wasn't
    // `"csv"` down the XLSX branch, so a `"pdf"` row would have been handed
    // to `read_xlsx`. Adding a source file kind must be a compile error here
    // rather than a silently wrong parser.
    const source = match(sourceFileType)
      .with("csv", () => {
        return {
          kind: "csv" as const,
          file,
          options: row.parseOptions as LocalDatasetCsvParseOptions,
        };
      })
      .with("xlsx", () => {
        return {
          kind: "xlsx" as const,
          file,
          options: row.parseOptions as LocalDatasetXlsxParseOptions,
        };
      })
      .with("pdf", () => {
        // A PDF's parquet is produced by table extraction, not by a DuckDB
        // reader, so there is nothing for the background transcoder to
        // redrive. The retained original is still safe in `sourceBytes`.
        return undefined;
      })
      .exhaustive();
    if (!source) {
      logger.log("Cannot resume: unsupported source file type", {
        ...params,
        sourceFileType,
      });
      return undefined;
    }
    return runBackgroundParquetTranscoding({
      datasetId: row.datasetId,
      workspaceId: row.workspaceId,
      userId: row.userId,
      source,
    });
  };
}

/**
 * Discards a dataset's locally-materialized data so the next read
 * re-materializes it.
 *
 * This is the single chokepoint for every cache-invalidation path (editing a
 * column description, backing out of a resync, re-picking a file), and it
 * enforces the invariant that no cache invalidation may destroy a retained
 * original:
 *
 * - Unpinned row: deleted outright, as before. `sourceBytes` there is only
 *   ever a resume cache and the parquet can be re-downloaded or re-uploaded,
 *   so losing the row is a recoverable cache miss.
 * - Pinned row with bytes (a retained original, e.g. a PDF): the row is kept
 *   and only the *derived* data is cleared. For an offline-only PDF these
 *   bytes are the only copy of the user's document in existence, so deleting
 *   the row would be unrecoverable data loss, not a cache miss. We leave
 *   `sourceBytes` plus the metadata needed to rebuild from it
 *   (`sourceFileName`, `sourceFileType`, `sourceFileSize`, `isSourcePinned`)
 *   untouched by omitting those keys from the update: Dexie's `update()`
 *   treats an explicitly-passed `undefined` as "delete this key".
 *
 * A pinned row whose bytes are already gone has nothing left to protect, so
 * it is deleted like any other stale row.
 *
 * Returns whether the retained original was preserved.
 */
export async function dropLocalDatasetData(
  datasetId: DatasetId,
): Promise<{ retainedOriginal: boolean }> {
  const row = await AvaDexie.DB.LocalDataset.get(datasetId);

  if (row?.isSourcePinned && row.sourceBytes) {
    await AvaDexie.DB.LocalDataset.update(datasetId, {
      parquetData: undefined,
      // Back to "needs materializing". `parseStatus === "ready"` with no
      // parquet would advertise queryable data that isn't there.
      parseStatus: "parsing",
      parseStartedAt: Date.now(),
      parseFailedReason: undefined,
    });
    return { retainedOriginal: true };
  }

  await AvaDexie.DB.LocalDataset.delete(datasetId);
  return { retainedOriginal: false };
}

function _makeDropLocalDataset(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["dropLocalDataset"] {
  return async (params) => {
    const logger = context.logger.appendName("dropLocalDataset");
    const { retainedOriginal } = await dropLocalDatasetData(params.datasetId);
    logger.log(
      retainedOriginal ?
        "Dropped local dataset's derived data, keeping its retained original"
      : "Dropping local dataset",
      params,
    );
    await DuckDbClient.dropTableViewAndFile({
      tableOrViewName: params.datasetId,
    });
  };
}

function _makeFetchCloudDatasetToLocalStorage(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["fetchCloudDatasetToLocalStorage"] {
  return async (params) => {
    const existingDownload = context.downloads.get(params.datasetId);
    if (existingDownload) {
      return existingDownload;
    }
    const download = _downloadCloudDataset({
      logger: context.logger,
      ...params,
    }).finally(() => {
      context.downloads.delete(params.datasetId);
    });
    context.downloads.set(params.datasetId, download);
    return download;
  };
}

function _createLocalDatasetMutations(
  logger: ILogger,
): LocalDatasetMutationRecord {
  const context = {
    logger,
    downloads: new Map<DatasetId, Promise<LocalDataset | undefined>>(),
  };
  return {
    startCsvImport: _makeStartCsvImport(context),
    startXlsxImport: _makeStartXlsxImport(context),
    startPdfImport: _makeStartPdfImport(context),
    transcodePdfExtraction: _makeTranscodePdfExtraction(context),
    transcodeReviewedPdfExtraction:
      _makeTranscodeReviewedPdfExtraction(context),
    resumeImport: _makeResumeImport(context),
    dropLocalDataset: _makeDropLocalDataset(context),
    fetchCloudDatasetToLocalStorage:
      _makeFetchCloudDatasetToLocalStorage(context),
  };
}

/** Manages datasets persisted in browser storage and loaded into DuckDB. */
export const LocalDatasetClient = createUsableServiceClient(
  createDexieCrudClient({
    db: AvaDexie.DB,
    modelName: "LocalDataset",
    parsers: LocalDatasetParsers,
    mutations: ({ logger }) => {
      return _createLocalDatasetMutations(logger);
    },
  }),
  {
    mutationFns: [
      "startCsvImport",
      "startXlsxImport",
      "startPdfImport",
      "resumeImport",
      "dropLocalDataset",
      "fetchCloudDatasetToLocalStorage",
    ],
  },
);
