import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import type {
  EtlCrawlReport,
  EtlCrawlStatus,
  EtlPipelineRunId,
  EtlRunOptions,
  EtlRunReport,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ExecutionFinalStatus,
  ExecutionInvocation,
  ExecutionScope,
  ExecutionScopeStatus,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

/**
 * Records one run as it goes. Every method resolves, even when recording
 * fails.
 */
export type RunExecutionRecorder = Readonly<{
  /** Records that the run started. */
  start: () => Promise<void>;
  /** Records one finished crawl. */
  recordCrawl: (crawl: EtlCrawlReport) => Promise<void>;
  /** Records how the run ended, from its report. */
  finishWithReport: (report: EtlRunReport) => Promise<void>;
  /** Records a run that threw before it had a report. */
  finishWithError: (args: {
    error: unknown;
    finishedAt: Date;
    setupMs: number;
  }) => Promise<void>;
}>;

const NO_RECORDING: RunExecutionRecorder = {
  start: async () => {},
  recordCrawl: async () => {},
  finishWithReport: async () => {},
  finishWithError: async () => {},
};

const SCOPE_STATUS_BY_CRAWL_STATUS: Readonly<
  Record<EtlCrawlStatus, ExecutionScopeStatus>
> = {
  ok: "succeeded",
  failed: "failed",
  skipped: "skipped",
};

/**
 * The run's options as the execution records them: ISO dates, set keys
 * only.
 */
function _buildRunArguments(
  options: EtlRunOptions,
): Readonly<Record<string, unknown>> {
  return {
    mode: options.mode,
    ...(options.since === undefined
      ? {}
      : { since: options.since.toISOString() }),
    ...(options.until === undefined
      ? {}
      : { until: options.until.toISOString() }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.scopes === undefined ? {} : { scopes: [...options.scopes] }),
  };
}

/**
 * How a run's execution starts: the run's id, mode, flags, and parsed
 * options.
 */
export function buildRunExecutionStart(args: {
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  options: EtlRunOptions;
  invocation: ExecutionInvocation;
  startedAt: Date;
}): ExecutionStart {
  const { options } = args;
  return {
    id: args.pipelineRunId,
    pipelineName: args.pipelineName,
    command: "run",
    runMode: options.mode,
    isDryRun: false,
    isScoped: options.scopes !== undefined,
    isLimited: options.limit !== undefined,
    isWindowed: options.since !== undefined || options.until !== undefined,
    arguments: _buildRunArguments(options),
    invocation: args.invocation,
    startedAt: args.startedAt,
  };
}

/** One crawl, as an execution scope. */
export function buildExecutionScopeFromCrawl(
  crawl: EtlCrawlReport,
): ExecutionScope {
  return {
    driveKey: crawl.driveKey,
    scopeKey: crawl.scopeKey,
    status: SCOPE_STATUS_BY_CRAWL_STATUS[crawl.status],
    error: crawl.error,
    windowSince: crawl.window.since,
    windowUntil: crawl.window.until,
    checkpointBefore: crawl.checkpointBefore,
    checkpointAfter: crawl.checkpointAfter,
    startedAt: crawl.startedAt,
    finishedAt: crawl.finishedAt,
    timings: crawl.metrics.timings,
    denominators: crawl.metrics.denominators,
    deletions: undefined,
    pipelineMetrics: crawl.metrics.pipelineMetrics,
  };
}

/**
 * A run's final status: `failed` when every crawl failed, `partially_failed`
 * when some did, otherwise `succeeded`. The error is the first failed
 * crawl's.
 */
export function getRunExecutionStatus(
  crawls: readonly EtlCrawlReport[],
): Readonly<{ status: ExecutionFinalStatus; error: string | undefined }> {
  const failedCrawls = crawls.filter((crawl) => {
    return crawl.status === "failed";
  });
  if (failedCrawls.length === 0) {
    return { status: "succeeded", error: undefined };
  }
  return {
    status:
      failedCrawls.length === crawls.length ? "failed" : "partially_failed",
    error: failedCrawls[0]?.error,
  };
}

/** A recorder that writes one execution through a never-fatal store. */
function _createStoreRecorder(args: {
  store: ExecutionStore;
  executionStart: ExecutionStart;
}): RunExecutionRecorder {
  const { store, executionStart } = args;
  const executionId = executionStart.id;
  return {
    start: () => {
      return store.start(executionStart);
    },
    recordCrawl: (crawl) => {
      return store.recordScope({
        executionId,
        scope: buildExecutionScopeFromCrawl(crawl),
      });
    },
    finishWithReport: (report) => {
      return store.finish({
        executionId,
        outcome: {
          ...getRunExecutionStatus(report.crawls),
          finishedAt: report.finishedAt,
          setupMs: report.setupMs,
          deletions: undefined,
        },
      });
    },
    finishWithError: ({ error, finishedAt, setupMs }) => {
      return store.finish({
        executionId,
        outcome: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          finishedAt,
          setupMs,
          deletions: undefined,
        },
      });
    },
  };
}

/**
 * Creates the recorder for one run. It records nothing when there is no
 * store or the run has no invocation. Recording never throws: a failure is
 * passed to `warn` (default `console.warn`), and after a failed start the
 * rest is skipped.
 */
export function createRunExecutionRecorder(args: {
  store: ExecutionStore | undefined;
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  options: EtlRunOptions;
  startedAt: Date;
  warn?: (message: string) => void;
}): RunExecutionRecorder {
  const { invocation } = args.options;
  if (args.store === undefined || invocation === undefined) {
    return NO_RECORDING;
  }
  return _createStoreRecorder({
    store: createNeverFatalExecutionStore({
      store: args.store,
      warn:
        args.warn ??
        ((message) => {
          console.warn(message);
        }),
    }),
    executionStart: buildRunExecutionStart({ ...args, invocation }),
  });
}
