import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";

/**
 * The parsing lifecycle of a locally-stored dataset.
 *
 * - `ready`: the parquet is fully transcoded and the row can be queried.
 * - `parsing`: the background parquet transcoding (the DuckDB `read_csv` /
 *   `read_xlsx` → parquet COPY) is in progress on this device. The row may
 *   have cached source bytes that allow resume after a refresh.
 * - `failed`: the background parquet transcoding errored out;
 *   `parseFailedReason` carries the message. UI should show a re-upload
 *   affordance.
 */
export type LocalDatasetParseStatus = "ready" | "parsing" | "failed";

/**
 * Source-file kind retained on disk while the background parquet
 * transcoding is in progress, so we can resume it after a tab refresh
 * without asking the user to re-pick the file.
 */
export type LocalDatasetSourceFileType = "csv" | "xlsx" | "pdf";

/**
 * Parse options needed to resume the background parquet transcoding for a
 * CSV import after the page reloads. Only set when `parseStatus ===
 * "parsing"` and `sourceFileType` is `"csv"`.
 */
export type LocalDatasetCsvParseOptions = {
  type: "csv";
  numRowsToSkip?: number;
  delimiter?: string;
};

/**
 * Parse options needed to resume the background parquet transcoding for an
 * XLSX import after the page reloads. Only set when `parseStatus ===
 * "parsing"` and `sourceFileType` is `"xlsx"`.
 */
export type LocalDatasetXlsxParseOptions = {
  type: "xlsx";
  sheet?: string;
  hasHeader?: boolean;
  /** Leading rows skipped before the header row. */
  rowsToSkip?: number;
};

/**
 * Parse options recorded for a PDF import. Unlike the CSV and XLSX shapes,
 * these do not redrive a background transcode: a PDF has no rows until the
 * user picks a region, so there is nothing to transcode. They record only how
 * much of the document was read, so a reload can read the same pages again.
 *
 * The user's chosen regions are deliberately not here yet. Nothing can select
 * one until the region picker exists, so persisting an always-empty list would
 * be committing to a storage shape ahead of the feature that fills it.
 */
export type LocalDatasetPdfParseOptions = {
  type: "pdf";
  /** Inclusive, one-based page range the user limited reading to. */
  pageRange?: readonly [number, number];
};

export type LocalDatasetParseOptions =
  | LocalDatasetCsvParseOptions
  | LocalDatasetXlsxParseOptions
  | LocalDatasetPdfParseOptions;

/**
 * This model tracks a locally-loaded dataset as a Parquet data blob.
 * It is loaded into an in-browser DuckDB instance as needed.
 */
type LocalDatasetDBRead = {
  /** The dataset id from the backend */
  datasetId: DatasetId;

  /** The workspace id the dataset belongs to */
  workspaceId: Workspace.Id;

  /** The user that has loaded this dataset locally */
  userId: UserId;

  /**
   * The raw data of the dataset as a Parquet blob. Undefined while the
   * background parquet transcoding is still running (`parseStatus ===
   * "parsing"` or `"failed"`).
   */
  parquetData: Blob | undefined;

  /**
   * Current parsing lifecycle stage. See `LocalDatasetParseStatus`.
   */
  parseStatus: LocalDatasetParseStatus;

  /**
   * Wall-clock timestamp (ms since epoch) when the most recent background
   * parquet transcoding started. Used to compute the "approximately X
   * minutes remaining" estimate the dataset status tooltip surfaces.
   */
  parseStartedAt: number | undefined;

  /**
   * Human-readable failure reason set when `parseStatus === "failed"`.
   */
  parseFailedReason: string | undefined;

  /**
   * Cached bytes of the original source file (CSV, XLSX, or PDF). Only
   * retained for files below the per-file cache threshold so we can resume
   * the background parquet transcoding after a tab refresh without asking
   * the user to re-pick the file. Cleared once `parseStatus` transitions to
   * `"ready"`, unless `isSourcePinned` is set, in which case these bytes are
   * the retained original and are kept indefinitely.
   */
  sourceBytes: Blob | undefined;

  /** Source file name supplied by the browser when caching. */
  sourceFileName: string | undefined;

  /** Source file type (`"csv"` or `"xlsx"`) when caching. */
  sourceFileType: LocalDatasetSourceFileType | undefined;

  /** Source file byte size, recorded even when we don't cache the bytes. */
  sourceFileSize: number | undefined;

  /**
   * LRU stamp for the source-bytes cache. Bumped whenever the row's source
   * bytes are read or written so the eviction policy can prefer older
   * entries when the cumulative cache exceeds its size budget.
   */
  lastSourceAccessedAt: number | undefined;

  /**
   * When true, `sourceBytes` is the retained original file rather than a
   * resume cache, and must survive both LRU eviction and the post-transcode
   * cleanup.
   *
   * Set for source types where the original cannot be reconstructed from the
   * parquet plus metadata; see `requiresOriginalFileRetention`. For an
   * offline-only PDF these bytes are the only copy in existence, so dropping
   * them is unrecoverable data loss rather than a cache miss.
   */
  isSourcePinned: boolean | undefined;

  /**
   * Parse options needed to redrive the background parquet transcoding
   * after a refresh. Stored as a discriminated union mirroring the CSV /
   * XLSX import shapes.
   */
  parseOptions: LocalDatasetParseOptions | undefined;
};

export type LocalDatasetModel = DexieCrudModelSpec<{
  modelName: "LocalDataset";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
  dbTypes: {
    DBRead: LocalDatasetDBRead;
    DBUpdate: Partial<LocalDatasetDBRead>;
  };
  modelTypes: {
    Read: LocalDatasetDBRead;
    Update: Partial<LocalDatasetDBRead>;
  };
}>;

export type LocalDataset<K extends keyof LocalDatasetModel = "Read"> =
  LocalDatasetModel[K];
