import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Env name for ETL root; matches ava-etl `ETL_PATHS_ROOT_ENV`. */
const _ETL_PATHS_ROOT_ENV = "ETL_PATHS_ROOT";

/**
 * Loads `apps/pipeline-server/pipelines/<name>/run.ts` and prints the return
 * value of `run()` (pipeline run id) as the last line of stdout.
 */
async function main(): Promise<void> {
  const pipelineName = process.argv[2];
  if (!pipelineName) {
    console.error("Usage: runPipelineOnce <pipeline-name>");
    process.exit(1);
  }

  const rootDir = fileURLToPath(new URL("..", import.meta.url));

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
  const pipelineRunId: string = await run();
  console.log(pipelineRunId);
}

void main();
