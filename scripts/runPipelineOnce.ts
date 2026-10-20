import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ETL_RUN_OPTIONS_ERROR_NAME } from "@avandar/etl";
import { parsePipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";
import { readRawPipelineRunOptionsFromArgv } from "@pipelines/shared/readRawPipelineRunOptionsFromArgv/readRawPipelineRunOptionsFromArgv";
import { runPipelineAndPrintReport } from "@pipelines/shared/runPipelineAndPrintReport/runPipelineAndPrintReport";
import type { EtlRunReport } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/** Env name for ETL root; matches etl `ETL_PATHS_ROOT_ENV`. */
const _ETL_PATHS_ROOT_ENV = "ETL_PATHS_ROOT";

/** API keys and other secrets only pipelines use. Optional and gitignored. */
const _PIPELINES_ENV_FILE = ".env.pipelines.local";

const _USAGE =
  "Usage: runPipelineOnce <pipeline-name> [--incremental] [--since <ISO 8601>] [--until <ISO 8601>] [--limit <n>]";

/**
 * Loads `.env.pipelines.local` if it exists. Variables already set (from
 * `.env.development`, which `ava` loads first, or the shell) are kept.
 */
function _loadPipelinesEnvFile(rootDir: string): void {
  const envFilePath = join(rootDir, _PIPELINES_ENV_FILE);
  if (existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
}

/** Prints why the options were rejected and the usage line, then exits 1. */
function _exitWithUsage(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(_USAGE);
  process.exit(1);
}

/**
 * Runs the pipeline and prints its report (see `runPipelineAndPrintReport`).
 * An `EtlRunOptionsError` exits with its message and the usage line, with no
 * stack trace. Any other error is rethrown.
 */
async function _runPipeline(
  run: (options: PipelineRunOptions) => Promise<EtlRunReport>,
  options: PipelineRunOptions,
): Promise<void> {
  try {
    await runPipelineAndPrintReport({ run, options });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === ETL_RUN_OPTIONS_ERROR_NAME) {
      _exitWithUsage(error);
    }
    throw error;
  }
}

/**
 * Loads `apps/pipeline-server/pipelines/<name>/run.ts`, runs it, and prints
 * the run's report as JSON on the last line of stdout. When every drive
 * failed, the report is still printed and the script exits 1.
 */
async function main(): Promise<void> {
  const [pipelineName, ...optionArgs] = process.argv.slice(2);
  if (!pipelineName) {
    console.error(_USAGE);
    process.exit(1);
  }
  let options: PipelineRunOptions;
  try {
    options = parsePipelineRunOptions(
      readRawPipelineRunOptionsFromArgv(optionArgs),
    );
  } catch (error: unknown) {
    _exitWithUsage(error);
  }

  const rootDir = fileURLToPath(new URL("..", import.meta.url));
  _loadPipelinesEnvFile(rootDir);

  if (!process.env[_ETL_PATHS_ROOT_ENV]?.trim()) {
    process.env[_ETL_PATHS_ROOT_ENV] = rootDir;
  }
  const runPath = join(
    rootDir,
    "apps/pipeline-server/pipelines",
    pipelineName,
    "run.ts",
  );

  if (!existsSync(runPath)) {
    console.error(`No pipeline module at ${runPath}`);
    process.exit(1);
  }

  const moduleUrl = pathToFileURL(runPath).href;
  const { run } = await import(moduleUrl);
  await _runPipeline(run, options);
}

void main();
