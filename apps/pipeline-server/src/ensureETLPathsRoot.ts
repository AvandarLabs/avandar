import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolves the monorepo root (directory containing `pnpm-workspace.yaml`) so
 * `etl-input/` and `etl-output/` match the repo `.gitignore` paths. Falls back
 * to `apps/pipeline-server/` if no workspace file is found.
 */
function _findETLPathsRootFromPipelineServerSrc(startDir: string): string {
  let dir = startDir;

  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parentDir = dirname(dir);
    if (parentDir === dir) {
      return join(startDir, "..");
    }
    dir = parentDir;
  }
}

const _srcDir = dirname(fileURLToPath(import.meta.url));

if (!process.env.ETL_PATHS_ROOT?.trim()) {
  process.env.ETL_PATHS_ROOT = _findETLPathsRootFromPipelineServerSrc(_srcDir);
}
