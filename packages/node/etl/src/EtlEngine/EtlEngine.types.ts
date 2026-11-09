import type { UUID } from "@avandar/utils";
import type { EtlWorkspaceLoadabilityRules } from "@etl/EtlConfig/EtlConfig.types";
import type { TransformedColumnDescription } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import type { EtlWriteThrottleEvent } from "@etl/EtlEngine/writeThrottle/createWriteThrottle";
import type { DuckDbSniffableDataType } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import type {
  CheckpointStore,
  DrivesStore,
  ListingsStore,
  ObjectStore,
} from "@etl/stores/EtlStores.types";
import type {
  ExecutionDenominators,
  ExecutionInvocation,
  ExecutionStageTimings,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";
import type { ExecutionFunctions } from "@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore";

/** A value, or a promise of one. */
export type PromisedOrValue<T> = Promise<T> | T;

/** Reads the time, for timing stages and dating crawls. */
export type EtlClock = Readonly<{
  /** The current date and time. */
  now: () => Date;
  /** Milliseconds from an arbitrary origin that never goes backwards. */
  monotonicMs: () => number;
  /**
   * Waits `ms` milliseconds: how the engine pauses between writes when the
   * database slows down or fails. Omit to wait on a real timer, as
   * `SYSTEM_CLOCK` does. A test clock can advance its own time instead.
   */
  sleep?: (ms: number) => Promise<void>;
}>;

/**
 * A pipeline's own counters and timers, collected per crawl into the
 * crawl's `pipelineMetrics`. Name them `<pipeline>.<what>`, such as
 * `hdx.parquet_footer_reads`.
 */
export type EtlPipelineMetrics = Readonly<{
  /** Adds `by` (default 1) to a counter. */
  increment: (name: string, by?: number) => void;
  /** Runs `work` and adds how long it took, in milliseconds, to a timer. */
  time: <T>(name: string, work: () => Promise<T>) => Promise<T>;
}>;

/** Everything one crawl measured. */
export type EtlCrawlMetrics = Readonly<{
  timings: ExecutionStageTimings;
  denominators: ExecutionDenominators;
  pipelineMetrics: Readonly<Record<string, number>>;
}>;

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
  /**
   * How the run was started, recorded with it. A run without one, such as
   * a test or script calling a pipeline's `run()` directly, is not
   * recorded.
   */
  invocation?: ExecutionInvocation;
  /**
   * Called as the run moves: when a crawl starts, after each page it loads,
   * and when it ends. Lets a caller show that a long run has not hung.
   */
  onProgress?: (progress: EtlRunProgress) => void;
}>;

/**
 * Where a run is, as `EtlRunOptions.onProgress` receives it. The counts are
 * totals for the whole run so far, not for the one crawl. A crawl the limit
 * skips only reports `crawl_finished`.
 */
export type EtlRunProgress = Readonly<{
  /**
   * `write_throttled` reports that the crawl eased off the database: after a
   * slow write, or a transient failure it will retry. `throttle` says which.
   */
  stage: "crawl_started" | "page_loaded" | "crawl_finished" | "write_throttled";
  driveKey: string;
  scopeKey: string;
  /** The crawl's 1-based position among the run's crawls. */
  crawlNumber: number;
  crawlCount: number;
  /** The run's limit on connections, when it has one. */
  limit: number | undefined;
  connectionsFetched: number;
  relationsTransformed: number;
  /** Columns the transformed relations declare. */
  columnsFound: number;
  /** How the crawl ended. Set only on `crawl_finished`. */
  status?: EtlCrawlStatus;
  /** What the crawl did to ease off. Set only on `write_throttled`. */
  throttle?: EtlWriteThrottleEvent;
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

/**
 * An organization level, broadest first, the way admin1, admin2, and admin3
 * nest administrative boundaries. Level 1 might be a city and level 2 one of
 * its agencies.
 */
export type EtlOrganizationLevel = 1 | 2 | 3 | 4;

/**
 * What each organization level is called on one drive, such as `City` for
 * level 1 and `Agency` for level 2. A level with no label is one the drive
 * does not use.
 */
export type EtlOrganizationLabels = Readonly<
  Partial<Record<EtlOrganizationLevel, string>>
>;

/** What the engine records about one drive in the drives table. */
export type EtlDriveDescription = Readonly<{
  organizationLabels: EtlOrganizationLabels;
}>;

/**
 * One listing usually added together with another, in the same drive,
 * written to the listing's `companion_listings`. The catalog shows it as
 * "recommended" beside the listing that names it.
 *
 * A companion is named by its API identity rather than its listing id,
 * because it may be written later in the run, in another scope, or in a
 * later run. For example, a GHO indicator names the dimension listing that
 * holds the country names for its `SpatialDim` codes.
 */
export type ListingCompanion = {
  /** Why it is recommended. `lookup`: it names the codes a column holds. */
  kind: "lookup";
  /** The companion's `external_dataset_id`, in this listing's drive. */
  externalDatasetId: string;
  /** The companion's `api_resource_id`, in this listing's drive. */
  apiResourceId: string;
  /** Column pairs that join this listing to the companion. */
  joinOn: ReadonlyArray<{ column: string; companionColumn: string }>;
};

/**
 * How to read a listing's freshness token with one GET, written to the
 * listing's `api_freshness_probe`. The edge function's freshness check and
 * the Parquet copy builder both run it through `readFreshnessProbeToken`.
 *
 * Structurally identical to `FreshnessProbe` in
 * `shared/connectors/open-data/`, which this package cannot import: keep the
 * two in step.
 *
 * - `json-paths`: the values at these paths into the JSON body, in order,
 *   joined by `|`. A path is a list of keys and indexes.
 * - `body-sha256`: the SHA-256 of the whole body.
 */
export type FreshnessProbe = {
  /** An `https` URL under the listing's `api_base_url`. */
  url: string;
  token:
    | {
        kind: "json-paths";
        paths: ReadonlyArray<ReadonlyArray<string | number>>;
      }
    | { kind: "body-sha256" };
};

/** The descriptive listing fields every relation carries or may carry. */
export type RelationDescription = Readonly<{
  /** The connection's id in the source, written to `external_dataset_id`. */
  externalDatasetId: string;
  displayName: string;
  organization1Name: string;
  /** Organization level 2, inside level 1, such as an agency. */
  organization2Name?: string;
  /** Organization level 3, inside level 2. */
  organization3Name?: string;
  /** Organization level 4, inside level 3. */
  organization4Name?: string;
  /** Subject areas the source files the dataset under. */
  domains?: readonly string[];
  /** The source's free-form keywords. */
  tags?: readonly string[];
  /**
   * What the source record says that no listing column holds, written to
   * `additional_source_metadata`: the record without the paths the field
   * mappings consume (`CatalogFieldMapper.omitMappedPaths`) and without the
   * fields the pipeline maps in code. Must survive `JSON.stringify`.
   */
  additionalSourceMetadata?: unknown;
  /**
   * The connection's source modification time, written to
   * `date_of_last_update`.
   */
  sourceUpdatedAt: Date | undefined;
  externalServiceName?: string;
  /** The page a person opens to see the asset at its source. */
  sourceUrl?: string;
  /** Where the asset's bytes can be downloaded, when the source says. */
  sourceDownloadUrl?: string;
  /**
   * The source's own name for the kind of asset this is, such as Socrata's
   * `map` or `file`. Written to `source_asset_type`.
   */
  sourceAssetType?: string;
  canonicalUrls?: readonly string[];
  license?: string;
  updateFrequency?: string;
  description?: string;
  notes?: string;
  metadata?: Readonly<Record<string, unknown>>;
  coverageStartDate?: Date;
  coverageEndDate?: Date;
  /**
   * The size in bytes the source reports for this relation's data, such
   * as a CKAN resource's `size`. Summed into the crawl's
   * `sourceBytesReported`.
   */
  sourceSizeBytes?: number;
  /**
   * Listings usually added with this one, written to `companion_listings`.
   * Only an `api_resource` relation's are written.
   */
  companions?: readonly ListingCompanion[];
  /**
   * How to read this relation's freshness token, written to
   * `api_freshness_probe`. Only an `api_resource` relation's is written.
   */
  freshnessProbe?: FreshnessProbe;
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
    /**
     * The format the resource is read as, such as `CSV`, or `undefined` for
     * an asset with none, such as a map. A relation with no format is not
     * workspace-loadable.
     */
    apiResourceFormat: string | undefined;
    /**
     * `false` when this pipeline cannot load this asset whatever its format,
     * such as a map, or a file whose columns could not be read. Omit it to
     * let the format decide, through the engine's `workspaceLoadability`
     * rules. `true` never overrides an unloadable format.
     */
    isWorkspaceLoadable?: boolean;
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
  /**
   * The database functions that record each run, such as
   * `rpc_pipeline_executions__start`. Omit to record nothing.
   */
  executionFunctions?: ExecutionFunctions;
  /**
   * The drives table, such as `data_catalog_drives`. Omit to record no
   * drives.
   */
  drivesTable?: string;
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
  /** Where runs are recorded. Omit to record nothing. */
  executions?: ExecutionStore;
  /** Where drives are recorded. Omit to write no drive and no `drive_id`. */
  drives?: DrivesStore;
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
    /** Replaces the system clock, for tests. */
    clock?: EtlClock;
    listDrives: () => PromisedOrValue<readonly TDrive[]>;
    /** Written to `api_base_url` on `api_resource` rows. */
    getDriveKey: (drive: TDrive) => string;
    /**
     * What the drives table records about a drive, such as its organization
     * labels. Omit to record each drive with no labels.
     */
    describeDrive?: (drive: TDrive) => EtlDriveDescription;
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
      /** Counters and timers this pipeline adds to the crawl's metrics. */
      metrics: EtlPipelineMetrics;
    }) => AsyncIterable<readonly TConnection[]>;
    /** Identifies a connection, so a repeat within one crawl is dropped. */
    getConnectionId: (connection: TConnection) => string;
    /** Returns only the scope's relations of one connection. */
    transform: (args: {
      drive: TDrive;
      scope: TScope;
      connection: TConnection;
      pipelineRunId: EtlPipelineRunId;
      /** Counters and timers this pipeline adds to the crawl's metrics. */
      metrics: EtlPipelineMetrics;
    }) => PromisedOrValue<readonly Relation[]>;
    /** Omit for a pipeline that only supports full runs. */
    incremental?: EtlIncrementalConfig<TDrive, TConnection>;
    /**
     * The formats this pipeline's listings cannot be loaded in a workspace,
     * usually from the shared ETL config file through
     * `getWorkspaceLoadabilityRules`. Omit to rule out no format.
     */
    workspaceLoadability?: EtlWorkspaceLoadabilityRules;
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
  /** When the crawl started and ended. */
  startedAt: Date;
  finishedAt: Date;
  /** The scope's checkpoint when the crawl started and when it ended. */
  checkpointBefore: Date | undefined;
  checkpointAfter: Date | undefined;
  /** The crawl's stage timings and the denominators that explain them. */
  metrics: EtlCrawlMetrics;
}>;

/** What happened during a run, one entry per crawl in crawl order. */
export type EtlRunReport = Readonly<{
  pipelineRunId: EtlPipelineRunId;
  mode: EtlRunMode;
  crawls: readonly EtlCrawlReport[];
  /** When the run started and ended. */
  startedAt: Date;
  finishedAt: Date;
  /** Milliseconds listing drives and their scopes, before any crawl. */
  setupMs: number;
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
   * the run's report when at least one crawl did not fail. A run that
   * throws after it started is recorded as failed.
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
