import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parsePipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";
import { readRawPipelineRunOptionsFromArgv } from "@pipelines/shared/readRawPipelineRunOptionsFromArgv/readRawPipelineRunOptionsFromArgv";
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

/**
 * Loads `apps/pipeline-server/pipelines/<name>/run.ts` and prints the return
 * value of `run()` (pipeline run id) as the last line of stdout.
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
    console.error(error instanceof Error ? error.message : String(error));
    console.error(_USAGE);
    process.exit(1);
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
  const pipelineRunId: string = await run(options);
  console.log(pipelineRunId);
}

void main();
