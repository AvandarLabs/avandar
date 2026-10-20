import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";

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
   * Last line of stdout when ok: the run report as JSON. A run where every
   * drive failed also ends stdout with its report, so a failed run carries
   * it too. Otherwise empty.
   */
  reportJson: string;
  errorText: string;
}>;

/**
 * The flags `scripts/runPipelineOnce.ts` accepts for the given options. It
 * parses argv strictly, so only these four flags are ever passed.
 */
function _buildRunArgs(runOptions: PipelineRunRequestOptions): string[] {
  return [
    ...(runOptions.incremental === true ? ["--incremental"] : []),
    ...(runOptions.since === undefined ? [] : ["--since", runOptions.since]),
    ...(runOptions.until === undefined ? [] : ["--until", runOptions.until]),
    ...(runOptions.limit === undefined
      ? []
      : ["--limit", String(runOptions.limit)]),
  ];
}

/** Whether a line is a JSON object, as the runner prints its report. */
function _isJsonObjectLine(line: string): boolean {
  try {
    const json: unknown = JSON.parse(line);
    return typeof json === "object" && json !== null;
  } catch {
    return false;
  }
}

/**
 * The result of a run that exited non-zero. When stdout ends with a report,
 * it is returned on its own and left out of the error text.
 */
function _buildFailedResult(args: {
  stdout: string;
  stderr: string;
  status: number | null;
}): RunPipelineLocalResult {
  const lines = args.stdout.trim().split("\n");
  const lastLine = lines[lines.length - 1] ?? "";
  const hasReport = _isJsonObjectLine(lastLine);
  const output = hasReport ? lines.slice(0, -1).join("\n") : args.stdout;
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
 * Runs a pipeline module via `pnpm exec vite-node` (no HTTP server).
 */
export function runPipelineLocal(options: {
  pipelineName: string;
  repoRoot: string;
  runOptions: PipelineRunRequestOptions;
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

  const lines = stdout.trim().split("\n");
  const lastLine = lines[lines.length - 1] ?? "";

  return {
    ok: true,
    reportJson: lastLine,
    errorText: "",
  };
}
