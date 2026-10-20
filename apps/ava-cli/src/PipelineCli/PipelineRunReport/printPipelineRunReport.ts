import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type { PipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

type _DriveReport = PipelineRunReport["drives"][number];

/** Width of the status column, so drive keys line up. */
const _STATUS_WIDTH = 7;

/** A drive's status, key, window, counts, and newest timestamp on one line. */
function _formatDriveLine(drive: _DriveReport): string {
  const since = drive.window.since ?? "the start";
  const until = drive.window.until ?? "now";
  const counts =
    `fetched ${String(drive.connectionsFetched)}, ` +
    `written ${String(drive.relationsWritten)}, ` +
    `unchanged ${String(drive.relationsUnchanged)}`;
  const newest = drive.newestTimestamp ?? "none";
  return `${drive.status.padEnd(_STATUS_WIDTH)} ${drive.driveKey}  ${since} to ${until}  ${counts}, newest ${newest}`;
}

/**
 * Prints a run's id and mode, then one line per drive with its window,
 * counts, newest timestamp, and status. A failed drive's error is printed
 * under its line.
 */
export function printPipelineRunReport(report: PipelineRunReport): void {
  printSuccess(`Pipeline run ${report.pipelineRunId} (${report.mode})`);
  if (report.drives.length === 0) {
    printInfo("No drives are configured, so nothing was crawled.");
    return;
  }
  report.drives.forEach((drive) => {
    if (drive.status === "failed") {
      printError(
        `${_formatDriveLine(drive)}\n${" ".repeat(_STATUS_WIDTH + 1)}error: ${drive.error ?? "unknown error"}`,
      );
      return;
    }
    if (drive.status === "skipped") {
      printWarn(`${_formatDriveLine(drive)} (limit reached)`);
      return;
    }
    printInfo(_formatDriveLine(drive));
  });
}
