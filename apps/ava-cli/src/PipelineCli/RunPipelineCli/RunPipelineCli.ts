import {
  findAvandarRepoRoot,
  runPipelineLocal,
} from "@ava-cli/PipelineCli/runPipelineLocal";
import { PipelineRunFailedError } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunFailedError";
import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { PipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import { printPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/printPipelineRunReport";
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

/** Parses the local runner's report line. */
function _parseReportJson(reportJson: string): PipelineRunReport {
  return PipelineRunReportSchema.parse(JSON.parse(reportJson));
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
}): PipelineRunReport {
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
    return _parseReportJson(localResult.reportJson);
  }
  if (localResult.reportJson === "") {
    throw new Error(localResult.errorText);
  }
  throw new PipelineRunFailedError({
    message: localResult.errorText,
    report: _parseReportJson(localResult.reportJson),
  });
}

/**
 * Runs a pipeline, on the pipeline-server or locally through vite-node.
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
    const report: PipelineRunReport = local
      ? _runLocally({ name, runOptions })
      : await sendRunPipelineRequest({ pipelineName: name, runOptions });
    printPipelineRunReport(report);
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);

    if (error instanceof PipelineRunFailedError) {
      printPipelineRunReport(error.report);
    }
    printError(`Failed to run pipeline: ${name}`);
    printError(message);
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
      "Process at most this many datasets. For testing a pipeline without " +
      "a full run. The hdx and socrata pipelines support it.",
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
