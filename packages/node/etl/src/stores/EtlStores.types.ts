import type {
  EtlOrganizationLabels,
  FreshnessProbe,
  ListingCompanion,
} from "@etl/EtlEngine/EtlEngine.types";
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
  organization1_name: string;
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
  /**
   * When the row's column types were verified against real data, or `null`
   * when the pipeline only knew column names. The app also writes this
   * when it verifies a listing's types, so it never counts as a change.
   */
  date_column_type_last_verified: string | null;
  /** Whether a workspace can add this listing. */
  is_workspace_loadable: boolean;
  source_asset_type: string | null;
  source_download_url: string | null;
  organization2_name: string | null;
  organization3_name: string | null;
  organization4_name: string | null;
  domains: readonly string[] | null;
  tags: readonly string[] | null;
  /**
   * What the source record says that no other column holds. A change to its
   * value never counts as a change on its own.
   */
  additional_source_metadata: unknown;
  /** The drive's `data_catalog_drives.id`, when the run has a drives store. */
  drive_id: string | null;
  /** Listings usually added with this one. Empty when there are none. */
  companion_listings: readonly ListingCompanion[];
  /** How to read the listing's freshness token, or `null` when not set. */
  api_freshness_probe: FreshnessProbe | null;
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

/** One listing row and its whole set of relation columns, written together. */
export type ListingWithColumns = Readonly<{
  row: ListingRowValues;
  /**
   * The listing's whole column set. Empty when the pipeline could not learn
   * the columns: they are filled in when the listing's types are verified.
   */
  columns: readonly RelationColumnRow[];
}>;

/**
 * The `original_data_type` of a column whose source declares no type and
 * whose type was not read from its data. Verifying the listing's types
 * replaces it with the verified type.
 */
export const UNKNOWN_ORIGINAL_DATA_TYPE = "unknown";

/** Reads and writes the listings table and the relation columns table. */
export type ListingsStore = Readonly<{
  /**
   * The stored rows that share a conflict key with any of `rows`. The result
   * is in no particular order and has at most one entry per key, so callers
   * match rows to their stored counterpart with `buildListingKeyFromRow`.
   */
  readRowsMatching: (
    rows: readonly ListingRowValues[],
  ) => Promise<readonly StoredListingRow[]>;
  /**
   * Inserts or replaces each entry's row on its conflict key and replaces
   * that listing's whole set of relation columns, and returns the stored
   * listings' ids in entry order. Only the ids come back, so a write never
   * carries every stored row back over the wire.
   *
   * Each call is one transaction: a call that fails writes none of its rows
   * and none of their columns, so a listing and its columns are always
   * written together. A call fails whole when two entries share a key.
   *
   * An entry whose row has no `date_column_type_last_verified` and the same
   * `metadata.relation_columns_sha256` as the stored row keeps the stored
   * columns and verification date, which the app may have verified since.
   */
  upsertListingsWithColumns: (
    entries: readonly ListingWithColumns[],
  ) => Promise<readonly string[]>;
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

/** One drive as the drives table stores it. */
export type DriveRow = Readonly<{
  pipelineName: string;
  driveKey: string;
  organizationLabels: EtlOrganizationLabels;
}>;

/** Writes the drives table. */
export type DrivesStore = Readonly<{
  /**
   * Inserts the drive, or replaces its labels when the pipeline already
   * wrote it, and resolves to its id.
   */
  upsert: (drive: DriveRow) => Promise<string>;
}>;
