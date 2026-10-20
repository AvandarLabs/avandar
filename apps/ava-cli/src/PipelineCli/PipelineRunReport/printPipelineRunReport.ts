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

type _DriveReport = PipelineRunReport["drives"][number];

/** Width of the status column, so drive keys line up. */
const _STATUS_WIDTH = 7;

/** Indent of a drive's detail lines: under its key, past the status. */
const _DETAIL_INDENT = " ".repeat(_STATUS_WIDTH + 1);

/**
 * A drive's status and key, then its window, counts, newest timestamp, and
 * any error on indented lines, so each line fits about 80 columns.
 */
function _formatDrive(drive: _DriveReport): string {
  const since = drive.window.since ?? "the start";
  const until = drive.window.until ?? "now";
  const counts =
    `fetched ${String(drive.connectionsFetched)}, ` +
    `written ${String(drive.relationsWritten)}, ` +
    `unchanged ${String(drive.relationsUnchanged)}`;
  const newest = drive.newestTimestamp ?? "none";
  const limitNote = drive.status === "skipped" ? " (limit reached)" : "";
  const lines = [
    `${drive.status.padEnd(_STATUS_WIDTH)} ${drive.driveKey}${limitNote}`,
    `${_DETAIL_INDENT}${since} to ${until}`,
    `${_DETAIL_INDENT}${counts}, newest ${newest}`,
    ...(drive.status === "failed"
      ? [`${_DETAIL_INDENT}error: ${drive.error ?? "unknown error"}`]
      : []),
  ];
  return lines.join("\n");
}

/** Prints a drive in its status's color. An unknown status is plain info. */
function _printDrive(drive: _DriveReport): void {
  const text = _formatDrive(drive);
  if (drive.status === "failed") {
    printError(text);
    return;
  }
  if (drive.status === "skipped") {
    printWarn(text);
    return;
  }
  printInfo(text);
}

/**
 * Prints the run's id and mode: red when every drive failed, yellow when
 * some did, green otherwise.
 */
function _printHeader(report: PipelineRunReport): void {
  const header = `Pipeline run ${report.pipelineRunId} (${report.mode})`;
  const failedCount = report.drives.filter((drive) => {
    return drive.status === "failed";
  }).length;
  if (failedCount > 0 && failedCount === report.drives.length) {
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
 * Prints a run's id and mode, then each drive with its window, counts,
 * newest timestamp, and status. A failed drive's error is printed under it.
 */
export function printPipelineRunReport(report: PipelineRunReport): void {
  _printHeader(report);
  if (report.drives.length === 0) {
    printInfo("No drives are configured, so nothing was crawled.");
    return;
  }
  report.drives.forEach(_printDrive);
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
