import { PipelineRunProgressSchema } from "@ava-cli/PipelineCli/PipelineRunProgress/PipelineRunProgress.schemas";
import { formatDuration } from "@ava-cli/PipelineCli/PipelineRunReport/printPipelineRunReport";
import { printInfo, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import type { PipelineRunProgress } from "@ava-cli/PipelineCli/PipelineRunProgress/PipelineRunProgress.schemas";

/** The least time between two printed page updates. */
const _PAGE_UPDATE_INTERVAL_MS = 5000;

/** How long the printer stays quiet before saying the run is still going. */
const _HEARTBEAT_AFTER_MS = 15_000;

/** How often the printer checks whether it has been quiet too long. */
const _HEARTBEAT_CHECK_MS = 1000;

/**
 * The least time between two printed slow-write lines. A database that
 * stays slow slows every write, and one line says so.
 */
const _SLOW_WRITE_LINE_INTERVAL_MS = 15_000;

const _KIB = 1024;
const _MIB = 1024 * _KIB;

/** Prints a run's progress as it arrives. */
export type PipelineProgressPrinter = Readonly<{
  /** Prints a progress event, or drops it when it cannot be read. */
  print: (progress: unknown) => void;
  /** Stops the "still running" check. Call it once the run ends. */
  stop: () => void;
}>;

/**
 * How far along the run is: the share of its dataset limit fetched, or,
 * with no limit, the share of its crawls done.
 */
function _formatPercent(progress: PipelineRunProgress): string {
  const { limit } = progress;
  if (limit !== undefined) {
    const share = limit === 0 ? 1 : progress.connectionsFetched / limit;
    const percent = Math.min(100, Math.round(share * 100));
    return `${String(percent)}% of the ${String(limit)}-dataset limit`;
  }
  const crawlsDone =
    progress.stage === "crawl_finished"
      ? progress.crawlNumber
      : progress.crawlNumber - 1;
  const percent = Math.round((crawlsDone / progress.crawlCount) * 100);
  return `${String(percent)}% of crawls done`;
}

/** The line's lead: the crawl's position, then what is happening to it. */
function _formatLead(progress: PipelineRunProgress): string {
  const position = `[${String(progress.crawlNumber)}/${String(progress.crawlCount)}]`;
  const crawl = `${progress.driveKey} [${progress.scopeKey}]`;
  if (progress.stage === "crawl_started") {
    return `${position} Crawling ${crawl}`;
  }
  if (progress.stage === "crawl_finished") {
    return `${position} Finished ${crawl} (${progress.status ?? "done"})`;
  }
  return `${position} ${crawl}`;
}

/**
 * One progress line: the crawl, how far along the run is, its datasets,
 * tables, and columns so far, and how long it has been going.
 */
export function formatPipelineRunProgress(
  progress: PipelineRunProgress,
  elapsedMs: number,
): string {
  return [
    _formatLead(progress),
    _formatPercent(progress),
    `${String(progress.connectionsFetched)} datasets`,
    `${String(progress.relationsTransformed)} tables`,
    `${String(progress.columnsFound)} columns`,
    formatDuration(elapsedMs),
  ].join(" · ");
}

/** What the printer remembers between events. */
type _PrinterState = {
  readonly startedAtMs: number;
  lastPrintedAtMs: number;
  lastPageLineAtMs: number | undefined;
  lastSlowWriteLineAtMs: number | undefined;
  latestLine: string;
};

/** A byte budget in MiB, to one decimal place when not whole, or KiB. */
function _formatBatchSize(byteBudget: number): string {
  if (byteBudget < _MIB) {
    return `${String(Math.round(byteBudget / _KIB))} KiB`;
  }
  const mebibytes = Math.round((byteBudget / _MIB) * 10) / 10;
  return `${String(mebibytes)} MiB`;
}

/**
 * One line for a `write_throttled` event: the crawl, then what it eased
 * off for, how long it waits, and how large its next batch may be.
 */
export function formatWriteThrottleLine(progress: PipelineRunProgress): string {
  const crawl = `[${String(progress.crawlNumber)}/${String(progress.crawlCount)}] ${progress.driveKey} [${progress.scopeKey}]`;
  const { throttle } = progress;
  if (throttle === undefined) {
    return crawl;
  }
  const batchSize = _formatBatchSize(throttle.byteBudget);
  const pause = formatDuration(throttle.pauseMs);
  if (throttle.reason === "slow_write") {
    return `${crawl} · writes slowed: ${batchSize} batches, pausing ${pause}`;
  }
  const count = `${String(throttle.failureCount ?? 1)} of ${String(throttle.maxFailures ?? 1)} in a row`;
  return `${crawl} · write failed (${count}), retrying in ${pause} with ${batchSize} batches: ${throttle.message ?? "unknown error"}`;
}

function _printLine(state: _PrinterState, line: string): void {
  printInfo(line);
  state.lastPrintedAtMs = Date.now();
}

/** Prints that the run is still going once the printer has been quiet. */
function _printHeartbeatWhenQuiet(state: _PrinterState): void {
  const quietMs = Date.now() - state.lastPrintedAtMs;
  if (quietMs < _HEARTBEAT_AFTER_MS) {
    return;
  }
  printWarn(
    `Still running, no update for ${formatDuration(quietMs)}. Last: ${state.latestLine}`,
  );
  state.lastPrintedAtMs = Date.now();
}

/**
 * Prints a throttle event as a warning: every transient failure, and a slow
 * write unless one was printed less than 15 seconds ago.
 */
function _printWriteThrottled(
  state: _PrinterState,
  progress: PipelineRunProgress,
): void {
  state.latestLine = formatWriteThrottleLine(progress);
  const isSlowWrite = progress.throttle?.reason === "slow_write";
  const isQuieted =
    isSlowWrite &&
    state.lastSlowWriteLineAtMs !== undefined &&
    Date.now() - state.lastSlowWriteLineAtMs < _SLOW_WRITE_LINE_INTERVAL_MS;
  if (isQuieted) {
    return;
  }
  printWarn(state.latestLine);
  state.lastPrintedAtMs = Date.now();
  if (isSlowWrite) {
    state.lastSlowWriteLineAtMs = Date.now();
  }
}

/**
 * Prints a readable event: a crawl's start or end at once, a page update
 * unless one was printed less than 5 seconds ago, and a throttle event as
 * `_printWriteThrottled` decides.
 */
function _printProgress(state: _PrinterState, rawProgress: unknown): void {
  const parsed = PipelineRunProgressSchema.safeParse(rawProgress);
  if (!parsed.success || parsed.data.status === "skipped") {
    return;
  }
  const progress = parsed.data;
  if (progress.stage === "write_throttled") {
    _printWriteThrottled(state, progress);
    return;
  }
  state.latestLine = formatPipelineRunProgress(
    progress,
    Date.now() - state.startedAtMs,
  );
  if (progress.stage !== "page_loaded") {
    _printLine(state, state.latestLine);
    return;
  }
  const isThrottled =
    state.lastPageLineAtMs !== undefined &&
    Date.now() - state.lastPageLineAtMs < _PAGE_UPDATE_INTERVAL_MS;
  if (!isThrottled) {
    _printLine(state, state.latestLine);
    state.lastPageLineAtMs = Date.now();
  }
}

/**
 * Creates a printer for a run's progress. Each crawl's start and end is
 * printed, page updates at most once every 5 seconds, each transient
 * failure the run retries, slow writes at most once every 15 seconds, and
 * a crawl the limit skipped not at all, since the final report lists it.
 * After 15 seconds without printing anything, it prints that the run is
 * still going, with the latest progress, so a hung run is easy to tell
 * apart from a slow one.
 *
 * @param options.waitingLabel - What the "still running" line says before
 * any progress arrives.
 */
export function createPipelineProgressPrinter(
  options: Readonly<{ waitingLabel?: string }> = {},
): PipelineProgressPrinter {
  const startedAtMs = Date.now();
  const state: _PrinterState = {
    startedAtMs,
    lastPrintedAtMs: startedAtMs,
    lastPageLineAtMs: undefined,
    lastSlowWriteLineAtMs: undefined,
    latestLine: options.waitingLabel ?? "starting the run",
  };
  const heartbeat = setInterval(() => {
    _printHeartbeatWhenQuiet(state);
  }, _HEARTBEAT_CHECK_MS);
  return {
    print: (rawProgress) => {
      _printProgress(state, rawProgress);
    },
    stop: () => {
      clearInterval(heartbeat);
    },
  };
}
