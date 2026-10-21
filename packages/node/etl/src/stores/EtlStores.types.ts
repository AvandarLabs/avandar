import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";

/** Which of the two listing shapes a row is. */
export type ListingAccessKind = "api_resource" | "pipeline_parquet";

/**
 * Every listings-table column the engine writes, and nothing else. Columns a
 * relation does not set are written as `null`, so a rewrite never leaves a
 * stale value behind. See the README's "Output contract".
 */
export type ListingRowValues = Readonly<{
  access_kind: ListingAccessKind;
  pipeline_name: string;
  pipeline_run_id: string;
  display_name: string;
  external_organization_name: string;
  external_dataset_id: string;
  date_of_last_update: string | null;
  date_of_last_sync: string;
  external_service_name: string | null;
  source_url: string | null;
  canonical_urls: readonly string[] | null;
  license: string | null;
  update_frequency: string | null;
  description: string | null;
  notes: string | null;
  metadata: Readonly<Record<string, unknown>> | null;
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  api_service: string | null;
  api_base_url: string | null;
  api_resource_id: string | null;
  api_resource_format: string | null;
  parquet_file_name: string | null;
  /** The scopes that produce this row, in the order they first wrote it. */
  pipeline_scope_keys: readonly string[];
}>;

/** A listing row as stored, with its primary key. */
export type StoredListingRow = ListingRowValues & Readonly<{ id: string }>;

/** One relation column, as written for one listing. */
export type RelationColumnRow = Readonly<{
  column_name: string;
  display_order: number;
  original_data_type: string;
  cast_data_type: DuckDbSniffableDataType;
}>;

/** Reads and writes the listings table and the relation columns table. */
export type ListingsStore = Readonly<{
  /**
   * The newest `date_of_last_update` among one pipeline's rows for one
   * drive, ignoring dates later than now, or `undefined` when there is none.
   */
  readHighWaterMark: (args: {
    pipelineName: string;
    apiBaseUrl: string;
  }) => Promise<Date | undefined>;
  /**
   * The stored rows that share a conflict key with any of `rows`. The result
   * is in no particular order and has at most one entry per key, so callers
   * match rows to their stored counterpart with `buildListingKeyFromRow`.
   */
  readRowsMatching: (
    rows: readonly ListingRowValues[],
  ) => Promise<readonly StoredListingRow[]>;
  /**
   * Inserts or replaces `rows` on their conflict keys, and returns the stored
   * rows. The result is in no particular order and has at most one entry per
   * key, so callers match rows with `buildListingKeyFromRow`. Two rows in one
   * call that share a key fail the whole call.
   *
   * The engine relies on each call being all-or-nothing: a call that fails
   * writes none of its rows. Callers pass rows of one listing kind per call,
   * since each kind has its own conflict target.
   */
  upsertRows: (
    rows: readonly ListingRowValues[],
  ) => Promise<readonly StoredListingRow[]>;
  /** Replaces one listing's whole set of relation columns. */
  replaceRelationColumns: (args: {
    listingId: string;
    columns: readonly RelationColumnRow[];
  }) => Promise<void>;
}>;

/** Writes Parquet objects to one storage bucket. */
export type ObjectStore = Readonly<{
  /** Uploads `bytes` to `path`, replacing any object already there. */
  upload: (args: {
    path: string;
    bytes: Uint8Array;
    contentType: string;
  }) => Promise<void>;
  /** The public URL an object at `path` is served from. */
  getPublicUrl: (path: string) => string;
}>;

/** Identifies one checkpoint: one scope of one drive of one pipeline. */
export type CheckpointKey = Readonly<{
  pipelineName: string;
  driveKey: string;
  scopeKey: string;
}>;

/** A checkpoint's value and the run that wrote it. */
export type StoredCheckpoint = CheckpointKey &
  Readonly<{
    /** The newest source timestamp the scope's crawls have loaded up to. */
    highWaterMark: Date;
    pipelineRunId: string;
  }>;

/**
 * Where incremental crawls keep their checkpoints. Every connection in a
 * scope with a source timestamp before its checkpoint has been loaded.
 */
export type CheckpointStore = Readonly<{
  /** Resolves to the checkpoint, or `undefined` when the scope has none. */
  read: (key: CheckpointKey) => Promise<Date | undefined>;
  /** Creates the checkpoint, or replaces its value and run id. */
  write: (checkpoint: StoredCheckpoint) => Promise<void>;
}>;
