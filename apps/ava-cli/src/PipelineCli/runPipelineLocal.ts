import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import type { CliInvocation } from "@ava-cli/PipelineCli/buildCliInvocation/buildCliInvocation";
import type { PipelineRunRequestOptions } from "@ava-cli/PipelineCli/PipelineRunRequestOptions.types";

/** The variable `scripts/runPipelineOnce.ts` reads the invocation from. */
const _INVOCATION_ENV = "AVA_PIPELINE_INVOCATION";

/**
 * Starts each progress line the runner writes to stderr. Matches
 * `PIPELINE_PROGRESS_LINE_PREFIX` in `runPipelineAndPrintReport.ts`.
 */
const _PROGRESS_LINE_PREFIX = "ava-pipeline-progress ";

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
 * Splits a stream's chunks into lines and passes each complete line to
 * `onLine`. Returns a function that passes the last, unterminated line.
 */
function _readLines(
  stream: NodeJS.ReadableStream | null,
  onLine: (line: string) => void,
): () => void {
  let pendingText = "";
  stream?.setEncoding("utf8");
  stream?.on("data", (chunk: string) => {
    const lines = (pendingText + chunk).split("\n");
    pendingText = lines.pop() ?? "";
    lines.forEach(onLine);
  });
  return () => {
    if (pendingText !== "") {
      onLine(pendingText);
    }
  };
}

/**
 * Sends a progress line's event to `onProgress` and returns true, or
 * returns false for any other line. A progress line that is not JSON is
 * dropped.
 */
function _handleProgressLine(
  line: string,
  onProgress: ((progress: unknown) => void) | undefined,
): boolean {
  if (!line.startsWith(_PROGRESS_LINE_PREFIX)) {
    return false;
  }
  try {
    onProgress?.(JSON.parse(line.slice(_PROGRESS_LINE_PREFIX.length)));
  } catch {
    // A garbled progress line only costs one update.
  }
  return true;
}

type _ChildOutput = Readonly<{
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}>;

/**
 * Spawns the runner and collects its output. Progress lines on stderr go to
 * `onProgress` as they arrive and are left out of the collected stderr.
 */
function _spawnRunner(args: {
  commandArgs: string[];
  repoRoot: string;
  env: NodeJS.ProcessEnv | undefined;
  onProgress: ((progress: unknown) => void) | undefined;
}): Promise<_ChildOutput> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", args.commandArgs, {
      cwd: args.repoRoot,
      env: args.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];
    const flushStdout = _readLines(child.stdout, (line) => {
      stdoutLines.push(line);
    });
    const flushStderr = _readLines(child.stderr, (line) => {
      if (!_handleProgressLine(line, args.onProgress)) {
        stderrLines.push(line);
      }
    });
    const finish = (status: number | null, error?: Error): void => {
      flushStdout();
      flushStderr();
      const stdout = stdoutLines.join("\n");
      resolve({ status, stdout, stderr: stderrLines.join("\n"), error });
    };
    child.on("error", (error) => {
      finish(null, error);
    });
    child.on("close", (status: number | null) => {
      finish(status);
    });
  });
}

/**
 * Runs a pipeline module via `pnpm exec vite-node` (no HTTP server). With
 * `invocation`, the run is recorded with the CLI's argv, actor, host, and
 * commit. Each progress event the runner reports goes to `onProgress`, as
 * parsed JSON, while the run is still going.
 */
export async function runPipelineLocal(options: {
  pipelineName: string;
  repoRoot: string;
  runOptions: PipelineRunRequestOptions;
  invocation?: CliInvocation;
  onProgress?: (progress: unknown) => void;
}): Promise<RunPipelineLocalResult> {
  const scriptPath = join(options.repoRoot, "scripts", "runPipelineOnce.ts");
  const spawnResult = await _spawnRunner({
    commandArgs: [
      "exec",
      "vite-node",
      "--config",
      "vite.script.config.ts",
      scriptPath,
      options.pipelineName,
      ..._buildRunArgs(options.runOptions),
    ],
    repoRoot: options.repoRoot,
    env:
      options.invocation === undefined
        ? undefined
        : {
            ...process.env,
            [_INVOCATION_ENV]: JSON.stringify(options.invocation),
          },
    onProgress: options.onProgress,
  });

  if (spawnResult.error) {
    return {
      ok: false,
      reportJson: "",
      errorText: spawnResult.error.message,
    };
  }

  const { stdout, stderr } = spawnResult;
  if (spawnResult.status !== 0) {
    return _buildFailedResult({ stdout, stderr, status: spawnResult.status });
  }

  return {
    ok: true,
    reportJson: _splitLastStdoutLine(stdout).lastLine,
    errorText: "",
  };
}
