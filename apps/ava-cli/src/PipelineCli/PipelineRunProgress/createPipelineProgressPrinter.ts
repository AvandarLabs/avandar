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
  latestLine: string;
};

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
 * Prints a readable event: a crawl's start or end at once, and a page
 * update unless one was printed less than 5 seconds ago.
 */
function _printProgress(state: _PrinterState, rawProgress: unknown): void {
  const parsed = PipelineRunProgressSchema.safeParse(rawProgress);
  if (!parsed.success || parsed.data.status === "skipped") {
    return;
  }
  const progress = parsed.data;
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
 * printed, page updates at most once every 5 seconds, and a crawl the
 * limit skipped not at all, since the final report lists it. After 15
 * seconds without printing anything, it prints that the run is still
 * going, with the latest progress, so a hung run is easy to tell apart
 * from a slow one.
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
