import type { UUID } from "@avandar/utils";
import type { TransformedColumnDescription } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import type {
  CheckpointStore,
  ListingsStore,
  ObjectStore,
} from "@etl/stores/EtlStores.types";

/** A value, or a promise of one. */
export type PromisedOrValue<T> = Promise<T> | T;

/** Identifies one `run()`. Written to `pipeline_run_id`. */
export type EtlPipelineRunId = UUID<"PipelineRun">;

/**
 * How a run picks a crawl's lower bound when no `since` is given: `full` has
 * none, and `incremental` starts at the scope's checkpoint.
 */
export type EtlRunMode = "full" | "incremental";

/** Options for one `run()`. */
export type EtlRunOptions = Readonly<{
  mode: EtlRunMode;
  /** Inclusive lower bound on source timestamps. Beats the checkpoint. */
  since?: Date;
  /** Exclusive upper bound on source timestamps. */
  until?: Date;
  /** The most connections to process, counted across every drive. */
  limit?: number;
  /** Crawl only these scope keys. Omit to crawl every scope. */
  scopes?: readonly string[];
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
   * `date_of_last_update`.
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
    /**
     * Written together with the relation's row. Empty when the pipeline
     * cannot learn the columns: they are filled in when the listing's types
     * are verified. A column whose type the pipeline
     * does not know is `VARCHAR`, with an `originalDataType` of the source's
     * own type label or `UNKNOWN_ORIGINAL_DATA_TYPE`.
     */
    columns: readonly RelationColumn[];
    /**
     * When the pipeline read the columns' real types from the source's data,
     * such as from a file's Parquet footer. Leave it unset when the types
     * are not verified: the app verifies them from a sample later.
     */
    columnTypesVerifiedAt?: Date;
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

/** The tables, function, and bucket the engine writes to. */
export type EtlOutput = Readonly<{
  listingsTable: string;
  /**
   * The database function that upserts listings with their relation columns
   * in one transaction, such as
   * `rpc_data_catalog_listings__upsert_with_relation_columns`.
   */
  upsertListingsFunction: string;
  /**
   * The checkpoints table. Required when the config has `incremental`,
   * because incremental crawls resume from it.
   */
  checkpointsTable?: string;
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
  /** Required when the config has `incremental`. */
  checkpoints?: CheckpointStore;
}>;

/**
 * What a pipeline adds to support incremental runs. `_TDrive` is unused. It
 * keeps the type's parameters in step with `EtlEngineConfig`'s.
 */
export type EtlIncrementalConfig<_TDrive, TConnection> = Readonly<{
  /** Modification time, or creation time when the source has no other. */
  getConnectionTimestamp: (connection: TConnection) => Date;
}>;

/** Everything one pipeline gives the engine. */
export type EtlEngineConfig<
  TDrive,
  TConnection,
  TScope extends EtlScope = EtlScope,
> = EtlDestination &
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
    /**
     * The drive's scopes, crawled in this order. Omit for one scope,
     * `all`, which leaves `TScope` at its default, `EtlScope`.
     */
    listScopes?: (drive: TDrive) => PromisedOrValue<readonly TScope[]>;
    /**
     * Pages of one scope's connections, oldest first when `incremental`
     * is set. Narrow to the scope at the source where it can.
     */
    extract: (args: {
      drive: TDrive;
      scope: TScope;
      window: EtlRunWindow;
      pipelineRunId: EtlPipelineRunId;
    }) => AsyncIterable<readonly TConnection[]>;
    /** Identifies a connection, so a repeat within one crawl is dropped. */
    getConnectionId: (connection: TConnection) => string;
    /** Returns only the scope's relations of one connection. */
    transform: (args: {
      drive: TDrive;
      scope: TScope;
      connection: TConnection;
      pipelineRunId: EtlPipelineRunId;
    }) => PromisedOrValue<readonly Relation[]>;
    /** Omit for a pipeline that only supports full runs. */
    incremental?: EtlIncrementalConfig<TDrive, TConnection>;
  }>;

/** How one crawl ended. `skipped` means the limit was reached first. */
export type EtlCrawlStatus = "ok" | "failed" | "skipped";

/**
 * What happened to one scope of one drive during a run. The counts and
 * `newestTimestamp` cover only pages that finished loading: when a crawl
 * fails partway through a page, rows that page already wrote are not
 * counted in `relationsWritten`. A drive that failed before its scopes
 * were known has one entry, with `scopeKey` `listScopes`.
 */
export type EtlCrawlReport = Readonly<{
  driveKey: string;
  scopeKey: string;
  window: EtlRunWindow;
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
  newestTimestamp: Date | undefined;
  status: EtlCrawlStatus;
  error?: string;
}>;

/** What happened during a run, one entry per crawl in crawl order. */
export type EtlRunReport = Readonly<{
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  crawls: readonly EtlCrawlReport[];
}>;

/** One drive's live scope keys. */
export type EtlDriveScopes = Readonly<{
  driveKey: string;
  scopeKeys: readonly string[];
}>;

/** A pipeline's engine. */
export type EtlEngineInstance = Readonly<{
  /**
   * Crawls every scope of every drive and loads what changed, resolving to
   * the run's report when at least one crawl did not fail.
   *
   * @throws Before listing drives, when `mode` is `incremental` on a
   * pipeline without `incremental` config, or `limit` is not an integer of 0
   * or more.
   * @throws Before listing drives, when no `stores` are given and
   * `supabase.url` or `supabase.serviceRoleKey` is missing.
   * @throws Before listing drives, when the config has `incremental` and
   * there is no checkpoint store.
   * @throws Whatever `listDrives` throws.
   * @throws EtlRunOptionsError when `scopes` is empty, holds an invalid key,
   * or names a scope no drive declares.
   * @throws EtlRunFailedError when every crawl failed.
   */
  run: (options: EtlRunOptions) => Promise<EtlRunReport>;
  /**
   * Lists each drive's live scope keys without crawling or touching any
   * store, so it needs no Supabase credentials.
   *
   * @throws Whatever `listDrives` throws, and when any drive's key or
   * scopes cannot be read or are invalid: a partial list would make live
   * scopes look retired.
   */
  listScopes: () => Promise<readonly EtlDriveScopes[]>;
}>;
