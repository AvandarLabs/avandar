import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

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
export type LocalDatasetSourceFileType = "csv" | "xlsx";

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
};

export type LocalDatasetParseOptions =
  | LocalDatasetCsvParseOptions
  | LocalDatasetXlsxParseOptions;

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
   * Cached bytes of the original source file (CSV or XLSX). Only retained
   * for files below the per-file cache threshold so we can resume the
   * background parquet transcoding after a tab refresh without asking the
   * user to re-pick the file. Always cleared once `parseStatus` transitions
   * to `"ready"`.
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
