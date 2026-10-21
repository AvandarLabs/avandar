import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type {
  PipelineRunReport,
  ReceivedPipelineRunReport,
} from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

type _CrawlReport = PipelineRunReport["crawls"][number];

/** Width of the status column, so drive keys line up. */
const _STATUS_WIDTH = 7;

/** Indent of a crawl's detail lines: under its drive, past the status. */
const _DETAIL_INDENT = " ".repeat(_STATUS_WIDTH + 1);

/**
 * A crawl's status, drive, and scope, then its window, counts, newest
 * timestamp, and any error on indented lines, so each line fits about 80
 * columns.
 */
function _formatCrawl(crawl: _CrawlReport): string {
  const since = crawl.window.since ?? "the start";
  const until = crawl.window.until ?? "now";
  const counts =
    `fetched ${String(crawl.connectionsFetched)}, ` +
    `written ${String(crawl.relationsWritten)}, ` +
    `unchanged ${String(crawl.relationsUnchanged)}`;
  const newest = crawl.newestTimestamp ?? "none";
  const limitNote = crawl.status === "skipped" ? " (limit reached)" : "";
  const lines = [
    `${crawl.status.padEnd(_STATUS_WIDTH)} ${crawl.driveKey} [${crawl.scopeKey}]${limitNote}`,
    `${_DETAIL_INDENT}${since} to ${until}`,
    `${_DETAIL_INDENT}${counts}, newest ${newest}`,
    ...(crawl.status === "failed"
      ? [`${_DETAIL_INDENT}error: ${crawl.error ?? "unknown error"}`]
      : []),
  ];
  return lines.join("\n");
}

/** Prints a crawl in its status's color. An unknown status is plain info. */
function _printCrawl(crawl: _CrawlReport): void {
  const text = _formatCrawl(crawl);
  if (crawl.status === "failed") {
    printError(text);
    return;
  }
  if (crawl.status === "skipped") {
    printWarn(text);
    return;
  }
  printInfo(text);
}

/**
 * Prints the run's id and mode: red when every crawl failed, yellow when
 * some did, green otherwise.
 */
function _printHeader(report: PipelineRunReport): void {
  const header = `Pipeline run ${report.pipelineRunId} (${report.mode})`;
  const failedCount = report.crawls.filter((crawl) => {
    return crawl.status === "failed";
  }).length;
  if (failedCount > 0 && failedCount === report.crawls.length) {
    printError(header);
    return;
  }
  if (failedCount > 0) {
    printWarn(header);
    return;
  }
  printSuccess(header);
}

/**
 * Prints a run's id and mode, then each crawl (a drive and scope) with its
 * window, counts, newest timestamp, and status. A failed crawl's error is
 * printed under it.
 */
export function printPipelineRunReport(report: PipelineRunReport): void {
  _printHeader(report);
  if (report.crawls.length === 0) {
    printInfo("No drives or scopes are configured, so nothing was crawled.");
    return;
  }
  report.crawls.forEach(_printCrawl);
}

/**
 * Prints a received report: a readable one as `printPipelineRunReport`
 * does, and one that did not match the expected shape as its raw JSON.
 */
export function printReceivedPipelineRunReport(
  received: ReceivedPipelineRunReport,
): void {
  if (received.isReadable) {
    printPipelineRunReport(received.report);
    return;
  }
  printWarn("The run's report is not in the expected shape. As sent:");
  printInfo(received.json);
}
