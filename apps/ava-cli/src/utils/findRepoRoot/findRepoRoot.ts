import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Walks up from `process.cwd()` until a directory looks like the Avandar
 * monorepo root, i.e. it holds both `pnpm-workspace.yaml` and
 * `apps/ava-cli/package.json`.
 *
 * `ava` is installed as a symlink on `$PATH`, so it can be invoked from
 * anywhere. Commands that operate on the repository need the repository the
 * user is standing in, not the one the CLI happened to be built from.
 *
 * @returns The absolute repo root, or undefined when not inside the monorepo.
 */
export function findRepoRoot(
  startDir: string = process.cwd(),
): string | undefined {
  let dir = startDir;

  while (true) {
    const hasWorkspaceFile = existsSync(join(dir, "pnpm-workspace.yaml"));
    const hasAvaCLI = existsSync(join(dir, "apps/ava-cli/package.json"));
    if (hasWorkspaceFile && hasAvaCLI) {
      return dir;
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) {
      return undefined;
    }
    dir = parentDir;
  }
}
