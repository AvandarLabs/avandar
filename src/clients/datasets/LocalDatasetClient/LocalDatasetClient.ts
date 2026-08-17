import { runBackgroundParquetTranscoding } from "@/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding";
import { sniffXlsxFile } from "@/clients/datasets/xlsxSniff";
import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient";
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
import type { ILogger } from "@avandar/logger";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

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
 */
async function _maybeCacheSourceBytes(file: File): Promise<Blob | undefined> {
  if (file.size > SOURCE_CACHE_PER_FILE_MAX_BYTES) {
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
  LocalDatasetCsvParseOptions | LocalDatasetXlsxParseOptions
> & { sourceFileType: "csv" | "xlsx" };

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
  const cachedBytes = await _maybeCacheSourceBytes(options.file);
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
    // CSV and XLSX are reconstructable from parquet + parse options, so
    // their cached source bytes are never pinned; see
    // `requiresOriginalFileRetention`.
    isSourcePinned: undefined,
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

function _makeResumeImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["resumeImport"] {
  return async (params) => {
    const row = await AvaDexie.DB.LocalDataset.get(params.datasetId);
    if (!row?.sourceBytes || !row.sourceFileType || !row.parseOptions) {
      context.logger
        .appendName("resumeImport")
        .log("Cannot resume: no cached source bytes", params);
      return undefined;
    }
    await AvaDexie.DB.LocalDataset.update(params.datasetId, {
      lastSourceAccessedAt: Date.now(),
    });
    const file = new File(
      [row.sourceBytes],
      row.sourceFileName ?? `${row.datasetId}.${row.sourceFileType}`,
      { type: row.sourceBytes.type },
    );
    const source =
      row.sourceFileType === "csv" ?
        {
          kind: "csv" as const,
          file,
          options: row.parseOptions as LocalDatasetCsvParseOptions,
        }
      : {
          kind: "xlsx" as const,
          file,
          options: row.parseOptions as LocalDatasetXlsxParseOptions,
        };
    return runBackgroundParquetTranscoding({
      datasetId: row.datasetId,
      workspaceId: row.workspaceId,
      userId: row.userId,
      source,
    });
  };
}

function _makeDropLocalDataset(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["dropLocalDataset"] {
  return async (params) => {
    context.logger
      .appendName("dropLocalDataset")
      .log("Dropping local dataset", params);
    await LocalDatasetClient.delete({ id: params.datasetId });
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
      "resumeImport",
      "dropLocalDataset",
      "fetchCloudDatasetToLocalStorage",
    ],
  },
);
