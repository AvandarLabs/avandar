import type { UUID } from "@avandar/utils";
import type { TransformedColumnDescription } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import type { ListingsStore, ObjectStore } from "@etl/stores/EtlStores.types";

/** A value, or a promise of one. */
export type PromisedOrValue<T> = Promise<T> | T;

/** Identifies one `run()`. Written to `pipeline_run_id`. */
export type EtlPipelineRunId = UUID<"PipelineRun">;

/**
 * How a run picks a drive's lower bound when no `since` is given: `full` has
 * none, and `incremental` starts at the drive's high-water mark.
 */
export type EtlRunMode = "full" | "incremental";

/** Options for one `run()`. */
export type EtlRunOptions = Readonly<{
  mode: EtlRunMode;
  /** Inclusive lower bound on source timestamps. Beats the high-water mark. */
  since?: Date;
  /** Exclusive upper bound on source timestamps. */
  until?: Date;
  /** The most connections to process, counted across every drive. */
  limit?: number;
}>;

/** The `[since, until)` range of source timestamps one drive's crawl covers. */
export type EtlRunWindow = Readonly<{
  since: Date | undefined;
  until: Date | undefined;
}>;

/**
 * One slice of a drive that is crawled and resumed on its own, such as one
 * file format or one category. A pipeline adds whatever fields its `extract`
 * and `transform` need to filter by it.
 */
export type EtlScope = Readonly<{
  /** Unique within one drive. Matches `ETL_SCOPE_KEY_PATTERN`. */
  key: string;
}>;

/** The descriptive listing fields every relation carries or may carry. */
export type RelationDescription = Readonly<{
  /** The connection's id in the source, written to `external_dataset_id`. */
  externalDatasetId: string;
  displayName: string;
  externalOrganizationName: string;
  /**
   * The connection's source modification time, written to
   * `date_of_last_update`. The default high-water mark reads it back.
   */
  sourceUpdatedAt: Date | undefined;
  externalServiceName?: string;
  sourceUrl?: string;
  canonicalUrls?: readonly string[];
  license?: string;
  updateFrequency?: string;
  description?: string;
  notes?: string;
  metadata?: Readonly<Record<string, unknown>>;
  coverageStartDate?: Date;
  coverageEndDate?: Date;
}>;

/** One column of an API relation, written to the relation columns table. */
export type RelationColumn = Readonly<{
  name: string;
  originalDataType: string;
  castDataType: DuckDbSniffableDataType;
}>;

/** A drive-index relation: a listing that points at an API, with no blob. */
export type ApiResourceRelation = RelationDescription &
  Readonly<{
    kind: "api_resource";
    apiResourceId: string;
    apiResourceFormat: string;
    /** Written only when the relation's row is written. */
    columns?: readonly RelationColumn[];
  }>;

/** A prebuilt relation: a CSV the engine converts to a Parquet object. */
export type PipelineParquetRelation = RelationDescription &
  Readonly<{
    kind: "pipeline_parquet";
    /** The object name and `parquet_file_name` stem, e.g. `WDICSV`. */
    tableBaseName: string;
    /** The CSV on disk. It must be named `<tableBaseName>.csv`. */
    csvPath: string;
    /** Casts for the CSV to Parquet conversion. Empty means infer them. */
    csvColumns: readonly TransformedColumnDescription[];
  }>;

/** One listing a pipeline's `transform` returns. */
export type Relation = ApiResourceRelation | PipelineParquetRelation;

/** The tables and bucket the engine writes to. */
export type EtlOutput = Readonly<{
  listingsTable: string;
  relationColumnsTable: string;
  /** Required only when a pipeline returns `pipeline_parquet` relations. */
  bucket?: string;
}>;

/** Where a pipeline's output goes: Supabase credentials and output names. */
export type EtlDestination = Readonly<{
  /** Values may be `undefined` so callers can pass env vars straight in. */
  supabase?: Readonly<{
    url: string | undefined;
    serviceRoleKey: string | undefined;
  }>;
  output: EtlOutput;
}>;

/** The stores the engine reads and writes through. */
export type EtlStores = Readonly<{
  listings: ListingsStore;
  /** Undefined when no bucket is configured. */
  objects: ObjectStore | undefined;
}>;

/** What a pipeline adds to support incremental runs. */
export type EtlIncrementalConfig<TDrive, TConnection> = Readonly<{
  /** Modification time, or creation time when the source has no other. */
  getConnectionTimestamp: (connection: TConnection) => Date;
  /** Overrides how a drive's high-water mark is read. */
  readHighWaterMark?: (args: {
    drive: TDrive;
    driveKey: string;
    /** `max(date_of_last_update)` for this pipeline and drive. */
    readDefaultHighWaterMark: () => Promise<Date | undefined>;
  }) => Promise<Date | undefined>;
}>;

/** Everything one pipeline gives the engine. */
export type EtlEngineConfig<TDrive, TConnection> = EtlDestination &
  Readonly<{
    /** Written to `pipeline_name`. */
    name: string;
    /** Written to `api_service`. Required for `api_resource` relations. */
    service?: string;
    /** Replaces the Supabase-backed stores, for tests. */
    stores?: EtlStores;
    listDrives: () => PromisedOrValue<readonly TDrive[]>;
    /** Written to `api_base_url` on `api_resource` rows. */
    getDriveKey: (drive: TDrive) => string;
    /** Pages of connections, oldest first when `incremental` is set. */
    extract: (args: {
      drive: TDrive;
      window: EtlRunWindow;
      pipelineRunId: EtlPipelineRunId;
    }) => AsyncIterable<readonly TConnection[]>;
    /** Identifies a connection, so a repeat within one drive is dropped. */
    getConnectionId: (connection: TConnection) => string;
    transform: (args: {
      drive: TDrive;
      connection: TConnection;
      pipelineRunId: EtlPipelineRunId;
    }) => PromisedOrValue<readonly Relation[]>;
    /** Omit for a pipeline that only supports full runs. */
    incremental?: EtlIncrementalConfig<TDrive, TConnection>;
  }>;

/** How one drive's crawl ended. `skipped` means the limit was reached first. */
export type EtlDriveStatus = "ok" | "failed" | "skipped";

/**
 * What happened to one drive during a run. The counts and `newestTimestamp`
 * cover only pages that finished loading: when a drive fails partway through
 * a page, rows that page already wrote are not counted in `relationsWritten`.
 */
export type EtlDriveReport = Readonly<{
  driveKey: string;
  window: EtlRunWindow;
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
  status: EtlDriveStatus;
  error?: string;
}>;

/** What happened during a run, one entry per drive in crawl order. */
export type EtlRunReport = Readonly<{
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  drives: readonly EtlDriveReport[];
}>;

/** A pipeline's engine. */
export type EtlEngineInstance = Readonly<{
  /**
   * Crawls every drive and loads what changed, resolving to the run's
   * report when at least one drive did not fail.
   *
   * @throws Before listing drives, when `mode` is `incremental` on a
   * pipeline without `incremental` config, or `limit` is not an integer of 0
   * or more.
   * @throws Before listing drives, when no `stores` are given and
   * `supabase.url` or `supabase.serviceRoleKey` is missing.
   * @throws Whatever `listDrives` throws.
   * @throws EtlRunFailedError when every drive failed.
   */
  run: (options: EtlRunOptions) => Promise<EtlRunReport>;
}>;
