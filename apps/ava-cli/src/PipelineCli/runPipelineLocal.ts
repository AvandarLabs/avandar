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
  /** Last line of stdout when ok (pipeline run id). */
  pipelineRunId: string;
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
      pipelineRunId: "",
      errorText: spawnResult.error.message,
    };
  }

  const stdout = spawnResult.stdout ?? "";
  const stderr = spawnResult.stderr ?? "";

  if (spawnResult.status !== 0) {
    const combined = `${stderr}\n${stdout}`.trim();
    return {
      ok: false,
      pipelineRunId: "",
      errorText: combined || `Exit code ${String(spawnResult.status)}`,
    };
  }

  const lines = stdout.trim().split("\n");
  const lastLine = lines[lines.length - 1] ?? "";

  return {
    ok: true,
    pipelineRunId: lastLine,
    errorText: "",
  };
}
