/** Which pipeline command an execution was. */
export type ExecutionCommand = "run" | "reset" | "prune_retired_scopes";

/** How an execution was started. */
export type ExecutionInvokedVia = "cli_local" | "cli_server" | "http";

/** How an execution ended. `running` is only ever stored, never passed. */
export type ExecutionFinalStatus =
  | "succeeded"
  | "partially_failed"
  | "failed"
  | "cancelled";

/** How one drive and scope of an execution ended. */
export type ExecutionScopeStatus = "succeeded" | "failed" | "skipped";

/** How a command was started, recorded as given. */
export type ExecutionInvocation = Readonly<{
  invokedVia: ExecutionInvokedVia;
  /** The CLI's argv after the binary, exactly as typed. */
  cliArgv?: readonly string[];
  /** The JSON body the pipeline server received. */
  requestBody?: unknown;
  /** `<OS user>@<hostname>` of the CLI that started it. */
  actor?: string;
  /** Hostname of the process that executed it. */
  host?: string;
  /** Git commit of the executing code. */
  codeVersion?: string;
}>;

/** An execution as it starts. */
export type ExecutionStart = Readonly<{
  /** A run passes its `pipelineRunId`. */
  id: string;
  pipelineName: string;
  command: ExecutionCommand;
  /** Set exactly when `command` is `run`. */
  runMode: "full" | "incremental" | undefined;
  isDryRun: boolean;
  isScoped: boolean;
  isLimited: boolean;
  isWindowed: boolean;
  /** The parsed, validated options. */
  arguments: Readonly<Record<string, unknown>>;
  invocation: ExecutionInvocation;
  startedAt: Date;
}>;

/**
 * Milliseconds a crawl spent in each stage, each summed over its pages.
 * Stages interleave page by page, so they do not add up to the crawl's
 * wall-clock time exactly.
 */
export type ExecutionStageTimings = Readonly<{
  /** Reading the checkpoint and resolving the window. */
  setupMs: number;
  /** Waiting on the source for each page. */
  extractMs: number;
  /** The pipeline's `transform` for every connection. */
  transformMs: number;
  /** Reading stored rows for the change check. */
  loadReadMs: number;
  /** Converting prebuilt CSVs to Parquet and summarizing them. */
  loadParquetBuildMs: number;
  /** Uploading Parquet objects. */
  loadParquetUploadMs: number;
  /** The transactions that save listings with their columns. */
  loadWriteMs: number;
  /** Writing the checkpoint after each page. */
  checkpointWriteMs: number;
}>;

/** The counts and sizes that explain a crawl's timings. */
export type ExecutionDenominators = Readonly<{
  pageCount: number;
  /** Connections in the window: the crawl's `connectionsFetched`. */
  datasetsFetched: number;
  /** Relations `transform` returned. */
  listingsConsidered: number;
  listingsWritten: number;
  listingsUnchanged: number;
  /** Calls that saved listings with their columns. */
  writeBatches: number;
  /** Relation columns across every relation considered. */
  columnsConsidered: number;
  /** Relation columns across the listings written. */
  columnsWritten: number;
  /** The widest relation considered. */
  maxColumnsPerListing: number;
  /** Bytes of the input CSVs converted to Parquet. */
  sourceCsvBytes: number;
  /** Bytes of the Parquet objects uploaded. */
  parquetBytesWritten: number;
  /** Rows in the Parquet objects uploaded. */
  parquetRowsWritten: number;
  /** Parquet objects not uploaded because their hash matched. */
  parquetUploadsSkipped: number;
  /** What the source reports, when it reports any size. */
  sourceBytesReported: number | undefined;
}>;

/** What removing a scope from a pipeline's listings did. */
export type ExecutionDeletionCounts = Readonly<{
  listingsDeleted: number;
  listingsKeptInUse: number;
  listingsDetached: number;
  checkpointsDeleted: number;
}>;

/** One drive and scope an execution worked on. */
export type ExecutionScope = Readonly<{
  driveKey: string;
  scopeKey: string;
  status: ExecutionScopeStatus;
  error: string | undefined;
  windowSince: Date | undefined;
  windowUntil: Date | undefined;
  checkpointBefore: Date | undefined;
  checkpointAfter: Date | undefined;
  startedAt: Date;
  finishedAt: Date;
  timings: ExecutionStageTimings;
  denominators: ExecutionDenominators;
  /** A prune's counts for this pair, or `undefined` for a crawl. */
  deletions: ExecutionDeletionCounts | undefined;
  /** Counters and timers only one pipeline has. */
  pipelineMetrics: Readonly<Record<string, number>>;
}>;

/** How an execution ended. */
export type ExecutionOutcome = Readonly<{
  status: ExecutionFinalStatus;
  error: string | undefined;
  finishedAt: Date;
  /** The execution's own setup, such as listing drives and scopes. */
  setupMs: number;
  /**
   * Deletions with no scope rows behind them, as a reset makes. Leave
   * undefined to keep the totals the scope rows add up to.
   */
  deletions:
    | (ExecutionDeletionCounts & Readonly<{ workspaceDatasetsDeleted: number }>)
    | undefined;
}>;

/** Where pipeline executions are recorded. */
export type ExecutionStore = Readonly<{
  /** Records that an execution started, as `running`. */
  start: (execution: ExecutionStart) => Promise<void>;
  /** Records one drive and scope of a started execution. */
  recordScope: (args: {
    executionId: string;
    scope: ExecutionScope;
  }) => Promise<void>;
  /** Records how a started execution ended. */
  finish: (args: {
    executionId: string;
    outcome: ExecutionOutcome;
  }) => Promise<void>;
}>;
