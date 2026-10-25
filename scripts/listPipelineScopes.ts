import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const _USAGE = "Usage: listPipelineScopes <pipeline-name>";

/**
 * Loads `apps/pipeline-server/pipelines/<name>/run.ts` and prints its live
 * scopes as `{"drives":[...]}` on the last line of stdout, the same body
 * `GET /:pipelineName/scopes` answers with. It reads no database and needs
 * no credentials. `ava pipeline prune-retired-scopes --local` runs it.
 */
async function main(): Promise<void> {
  const [pipelineName, ...extraArgs] = process.argv.slice(2);
  if (!pipelineName || extraArgs.length > 0) {
    console.error(_USAGE);
    process.exit(1);
  }
  const rootDir = fileURLToPath(new URL("..", import.meta.url));
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
  const pipelineModule = await import(pathToFileURL(runPath).href);
  if (typeof pipelineModule.listScopes !== "function") {
    console.error(`Pipeline "${pipelineName}" does not export listScopes().`);
    process.exit(1);
  }
  const drives: unknown = await pipelineModule.listScopes();
  console.log(JSON.stringify({ drives }));
}

void main();
