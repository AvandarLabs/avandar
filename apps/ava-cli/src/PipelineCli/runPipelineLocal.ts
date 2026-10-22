import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { CliInvocation } from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";

/** The variable `scripts/runPipelineOnce.ts` reads the invocation from. */
const _INVOCATION_ENV = "AVA_PIPELINE_INVOCATION";

/**
 * Walks up from `process.cwd()` until a directory contains both
 * `pnpm-workspace.yaml` and `apps/pipeline-server/pipelines`.
 */
export function findAvandarRepoRoot(): string | undefined {
  let dir = process.cwd();

  while (true) {
    const workspacePath = join(dir, "pnpm-workspace.yaml");
    const pipelinesPath = join(dir, "apps/pipeline-server/pipelines");

    if (existsSync(workspacePath) && existsSync(pipelinesPath)) {
      return dir;
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) {
      return undefined;
    }

    dir = parentDir;
  }
}

export type RunPipelineLocalResult = Readonly<{
  ok: boolean;
  /**
   * Last line of stdout when ok: the run report as JSON. A failed run
   * carries it too when its last line is a report, as when every drive
   * failed. Otherwise empty.
   */
  reportJson: string;
  errorText: string;
}>;

/**
 * The flags `scripts/runPipelineOnce.ts` accepts for the given options. It
 * parses argv strictly, so only these five flags are ever passed.
 */
function _buildRunArgs(runOptions: PipelineRunRequestOptions): string[] {
  return [
    ...(runOptions.incremental === true ? ["--incremental"] : []),
    ...(runOptions.since === undefined ? [] : ["--since", runOptions.since]),
    ...(runOptions.until === undefined ? [] : ["--until", runOptions.until]),
    ...(runOptions.limit === undefined
      ? []
      : ["--limit", String(runOptions.limit)]),
    ...(runOptions.scopes === undefined
      ? []
      : ["--scope", runOptions.scopes.join(",")]),
  ];
}

/** Stdout split into its last line and everything printed before it. */
function _splitLastStdoutLine(
  stdout: string,
): Readonly<{ earlierOutput: string; lastLine: string }> {
  const lines = stdout.trim().split("\n");
  return {
    earlierOutput: lines.slice(0, -1).join("\n"),
    lastLine: lines[lines.length - 1] ?? "",
  };
}

/** Whether a line is a run report as JSON, as the runner prints it. */
function _isReportLine(line: string): boolean {
  try {
    return PipelineRunReportSchema.safeParse(JSON.parse(line)).success;
  } catch {
    return false;
  }
}

/**
 * The result of a run that exited non-zero. When stdout ends with a report,
 * it is returned on its own and left out of the error text. Otherwise the
 * error text keeps all of stdout.
 */
function _buildFailedResult(args: {
  stdout: string;
  stderr: string;
  status: number | null;
}): RunPipelineLocalResult {
  const { earlierOutput, lastLine } = _splitLastStdoutLine(args.stdout);
  const hasReport = _isReportLine(lastLine);
  const output = hasReport ? earlierOutput : args.stdout;
  const combined = [args.stderr.trim(), output.trim()]
    .filter((text) => {
      return text !== "";
    })
    .join("\n");
  return {
    ok: false,
    reportJson: hasReport ? lastLine : "",
    errorText: combined || `Exit code ${String(args.status)}`,
  };
}

/**
 * Runs a pipeline module via `pnpm exec vite-node` (no HTTP server). With
 * `invocation`, the run is recorded with the CLI's argv, actor, host, and
 * commit.
 */
export function runPipelineLocal(options: {
  pipelineName: string;
  repoRoot: string;
  runOptions: PipelineRunRequestOptions;
  invocation?: CliInvocation;
}): RunPipelineLocalResult {
  const scriptPath = join(options.repoRoot, "scripts", "runPipelineOnce.ts");

  const spawnResult = spawnSync(
    "pnpm",
    [
      "exec",
      "vite-node",
      "--config",
      "vite.script.config.ts",
      scriptPath,
      options.pipelineName,
      ..._buildRunArgs(options.runOptions),
    ],
    {
      cwd: options.repoRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      ...(options.invocation === undefined
        ? {}
        : {
            env: {
              ...process.env,
              [_INVOCATION_ENV]: JSON.stringify(options.invocation),
            },
          }),
    },
  );

  if (spawnResult.error) {
    return {
      ok: false,
      reportJson: "",
      errorText: spawnResult.error.message,
    };
  }

  const stdout = spawnResult.stdout ?? "";
  const stderr = spawnResult.stderr ?? "";

  if (spawnResult.status !== 0) {
    return _buildFailedResult({ stdout, stderr, status: spawnResult.status });
  }

  return {
    ok: true,
    reportJson: _splitLastStdoutLine(stdout).lastLine,
    errorText: "",
  };
}
