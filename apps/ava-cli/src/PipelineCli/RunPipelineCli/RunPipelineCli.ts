import {
  findAvandarRepoRoot,
  runPipelineLocal,
} from "@ava-cli/PipelineCli/runPipelineLocal";
import { PipelineRunFailedError } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunFailedError";
import type { ReceivedPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import { printReceivedPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/printPipelineRunReport";
import { readPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/readPipelineRunReport";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";
import { sendRunPipelineRequest } from "@ava-cli/PipelineCli/sendRunPipelineRequest";
import { printError, printInfo } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

function _assertOneLowerBound(runOptions: PipelineRunRequestOptions): void {
  if (runOptions.incremental === true && runOptions.since !== undefined) {
    throw new Error(
      "Pass either --incremental or --since, not both: they name two different lower bounds.",
    );
  }
}

/**
 * Reads the local runner's report line.
 *
 * @throws With the line itself when it is not JSON.
 */
function _readReportLine(reportLine: string): ReceivedPipelineRunReport {
  let json: unknown;
  try {
    json = JSON.parse(reportLine);
  } catch {
    throw new Error(`The local runner did not print a report: ${reportLine}`);
  }
  return readPipelineRunReport(json);
}

/**
 * Runs the pipeline through the local runner and parses its report.
 *
 * @throws PipelineRunFailedError, carrying the report, when every drive
 * failed.
 */
function _runLocally(args: {
  name: string;
  runOptions: PipelineRunRequestOptions;
}): ReceivedPipelineRunReport {
  const repoRoot: string | undefined = findAvandarRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root (look for " +
        "pnpm-workspace.yaml and apps/pipeline-server/pipelines). " +
        "Run this command from inside the repository.",
    );
  }
  const localResult = runPipelineLocal({
    pipelineName: args.name,
    repoRoot,
    runOptions: args.runOptions,
  });
  if (localResult.ok) {
    return _readReportLine(localResult.reportJson);
  }
  if (localResult.reportJson === "") {
    throw new Error(localResult.errorText);
  }
  throw new PipelineRunFailedError({
    message: localResult.errorText,
    report: _readReportLine(localResult.reportJson),
  });
}

/**
 * Runs a pipeline, on the pipeline-server or locally through vite-node.
 * When every drive failed, it prints the report and sets the exit code to 1
 * instead of throwing. Any other error is printed and rethrown.
 *
 * @param options.name - The pipeline's directory name.
 * @param options.local - Run it in-process instead of on the server.
 * @param options.incremental - Resume each drive from its high-water mark.
 * @param options.since - Only process what changed at or after this time.
 * @param options.until - Only process what changed before this time.
 * @param options.limit - Process at most this many datasets.
 */
export async function runPipelineCommand(options: {
  name: string;
  local: boolean;
  incremental?: boolean;
  since?: string;
  until?: string;
  limit?: number;
}): Promise<void> {
  const { name, local } = options;
  const runOptions: PipelineRunRequestOptions = {
    incremental: options.incremental,
    since: options.since,
    until: options.until,
    limit: options.limit,
  };

  try {
    _assertOneLowerBound(runOptions);
    printInfo(`Running pipeline: ${name}`);
    const report: ReceivedPipelineRunReport = local
      ? _runLocally({ name, runOptions })
      : await sendRunPipelineRequest({ pipelineName: name, runOptions });
    printReceivedPipelineRunReport(report);
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);

    if (error instanceof PipelineRunFailedError) {
      printReceivedPipelineRunReport(error.report);
    }
    printError(`Failed to run pipeline: ${name}`);
    printError(message);
    // The report already says why every drive failed, so the run only sets
    // a failing exit code: a thrown error would add a stack trace after it.
    if (error instanceof PipelineRunFailedError) {
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

export const RunPipelineCli = Acclimate.createCLI("run")
  .description(
    "Run a pipeline on the pipeline-server, or use --local to run the " +
      "pipeline module via vite-node without starting the server.",
  )
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The pipeline name to run.",
    type: "string",
  })
  .addOption({
    name: "--local",
    aliases: ["-l"] as const,
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Run the pipeline TypeScript module locally (no HTTP server required).",
  })
  .addOption({
    name: "--incremental",
    type: "boolean",
    required: false,
    defaultValue: false,
    description:
      "Only process what was created or changed since the newest timestamp " +
      "already stored for each drive. Also continues a cancelled or limited run.",
  })
  .addOption({
    name: "--since",
    type: "string",
    required: false,
    description:
      "Only process what changed at or after this ISO 8601 timestamp with a " +
      "timezone, such as 2026-10-01T00:00:00Z. Cannot be combined with " +
      "--incremental. A --since later than a drive's last stored update " +
      "leaves a gap that only a run reaching back over it fills.",
  })
  .addOption({
    name: "--until",
    type: "string",
    required: false,
    description:
      "Only process what changed before this ISO 8601 timestamp with a timezone.",
  })
  .addOption({
    name: "--limit",
    type: "number",
    required: false,
    description:
      "Process at most this many datasets (input CSVs for world-bank__wdi). " +
      "For testing a pipeline without a full run.",
    parser: (value: string) => {
      return Number(value);
    },
    validator: (value: number) => {
      return (
        (Number.isInteger(value) && value >= 1) ||
        "--limit must be a positive integer."
      );
    },
  })
  .action(
    (
      args: Readonly<{
        name: string;
        local: boolean;
        incremental: boolean;
        since?: string;
        until?: string;
        limit?: number;
      }>,
    ) => {
      return runPipelineCommand(args);
    },
  );
