import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import type {
  EtlClock,
  EtlCrawlMetrics,
  EtlPipelineMetrics,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ExecutionDenominators,
  ExecutionStageTimings,
} from "@etl/stores/ExecutionStore.types";

/** The clock the engine reads unless a config replaces it. */
export const SYSTEM_CLOCK: EtlClock = {
  now: () => {
    return new Date();
  },
  monotonicMs: () => {
    return performance.now();
  },
};

/** The metrics of a crawl that did no work. */
export const NO_CRAWL_METRICS: EtlCrawlMetrics = {
  timings: NO_STAGE_TIMINGS,
  denominators: NO_DENOMINATORS,
  pipelineMetrics: {},
};

/** One timed stage of a crawl. */
export type EtlStage = keyof ExecutionStageTimings;

/**
 * A denominator the recorder counts by adding to it. The crawl's own counts
 * (fetched, written, unchanged) come from its progress instead.
 */
export type CountedDenominator = Exclude<
  keyof ExecutionDenominators,
  | "datasetsFetched"
  | "listingsWritten"
  | "listingsUnchanged"
  | "maxColumnsPerListing"
  | "sourceBytesReported"
>;

/** The crawl's own counts, which complete a snapshot's denominators. */
export type CrawlCounts = Readonly<{
  connectionsFetched: number;
  relationsWritten: number;
  relationsUnchanged: number;
}>;

/** Accumulates one crawl's timings and denominators as it runs. */
export type CrawlMetricsRecorder = Readonly<{
  /** Runs `work` and adds how long it took to `stage`, even if it throws. */
  time: <T>(stage: EtlStage, work: () => Promise<T>) => Promise<T>;
  /** Adds `by` to a counted denominator. */
  count: (denominator: CountedDenominator, by: number) => void;
  /** Keeps the widest listing's column count. */
  observeListingWidth: (columnCount: number) => void;
  /** Adds a size the source reported for one relation. */
  addSourceBytes: (bytes: number) => void;
  /** Handed to the pipeline's `extract` and `transform`. */
  pipelineMetrics: EtlPipelineMetrics;
  /** Everything recorded so far, completed with the crawl's own counts. */
  snapshot: (counts: CrawlCounts) => EtlCrawlMetrics;
}>;

async function _timed<T>(args: {
  clock: EtlClock;
  work: () => Promise<T>;
  onElapsed: (elapsedMs: number) => void;
}): Promise<T> {
  const startMs = args.clock.monotonicMs();
  try {
    return await args.work();
  } finally {
    args.onElapsed(args.clock.monotonicMs() - startMs);
  }
}

function _roundValues<TKey extends string>(
  values: Readonly<Record<TKey, number>>,
): Record<TKey, number> {
  return Object.fromEntries(
    Object.entries<number>(values).map(([key, value]) => {
      return [key, Math.round(value)];
    }),
  ) as Record<TKey, number>;
}

function _createPipelineMetrics(
  clock: EtlClock,
  values: Record<string, number>,
): EtlPipelineMetrics {
  const add = (name: string, by: number): void => {
    values[name] = (values[name] ?? 0) + by;
  };
  return {
    increment: (name, by = 1) => {
      add(name, by);
    },
    time: (name, work) => {
      return _timed({
        clock,
        work,
        onElapsed: (elapsedMs) => {
          add(name, elapsedMs);
        },
      });
    },
  };
}

/**
 * Creates a recorder for one crawl's timings and denominators. Stage times
 * are read from `clock.monotonicMs`, summed per stage, and rounded to whole
 * milliseconds in each snapshot.
 *
 * @param clock - The engine's clock.
 */
export function createCrawlMetricsRecorder(
  clock: EtlClock,
): CrawlMetricsRecorder {
  const timings: Record<EtlStage, number> = { ...NO_STAGE_TIMINGS };
  const counts: Record<CountedDenominator, number> = {
    pageCount: 0,
    listingsConsidered: 0,
    writeBatches: 0,
    columnsConsidered: 0,
    columnsWritten: 0,
    sourceCsvBytes: 0,
    parquetBytesWritten: 0,
    parquetRowsWritten: 0,
    parquetUploadsSkipped: 0,
  };
  const widest = { columnCount: 0 };
  const reported: { bytes: number | undefined } = { bytes: undefined };
  const pipelineValues: Record<string, number> = {};
  return {
    time: (stage, work) => {
      return _timed({
        clock,
        work,
        onElapsed: (elapsedMs) => {
          timings[stage] += elapsedMs;
        },
      });
    },
    count: (denominator, by) => {
      counts[denominator] += by;
    },
    observeListingWidth: (columnCount) => {
      widest.columnCount = Math.max(widest.columnCount, columnCount);
    },
    addSourceBytes: (bytes) => {
      reported.bytes = (reported.bytes ?? 0) + bytes;
    },
    pipelineMetrics: _createPipelineMetrics(clock, pipelineValues),
    snapshot: (crawlCounts) => {
      return {
        timings: _roundValues(timings),
        denominators: {
          ...counts,
          datasetsFetched: crawlCounts.connectionsFetched,
          listingsWritten: crawlCounts.relationsWritten,
          listingsUnchanged: crawlCounts.relationsUnchanged,
          maxColumnsPerListing: widest.columnCount,
          sourceBytesReported: reported.bytes,
        },
        pipelineMetrics: _roundValues(pipelineValues),
      };
    },
  };
}
