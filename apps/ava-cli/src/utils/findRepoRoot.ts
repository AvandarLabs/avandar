import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The Avandar monorepo root containing `startDir`, or `undefined` when that
 * directory is not inside the monorepo.
 *
 * `ava` is installed as a symlink on `$PATH`, so it can be invoked from
 * anywhere. Commands that operate on the repository need the repository the
 * user is standing in, not the one the CLI happened to be built from.
 */
export function findRepoRoot(
  startDir: string = process.cwd(),
): string | undefined {
  let dir = startDir;

  while (true) {
    // The monorepo root is the directory holding both markers.
    const hasWorkspaceFile = existsSync(join(dir, "pnpm-workspace.yaml"));
    const hasAvaCli = existsSync(join(dir, "apps/ava-cli/package.json"));
    if (hasWorkspaceFile && hasAvaCli) {
      return dir;
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) {
      return undefined;
    }
    dir = parentDir;
  }
}
