import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

/**
 * Detects a running `ava` that no longer matches `apps/ava-cli` in the repo.
 *
 * `ava` is a symlink on `$PATH` pointing at a bundle built by
 * `pnpm build:ava-cli`. Nothing rebuilds it automatically, so it is easy to
 * pull, switch branches, or edit a command and then run a stale binary. For a
 * command like `ava release`, which pushes tags and deploys production, running
 * yesterday's code is not an acceptable failure mode, so every command refuses
 * to run until the bundle matches the source.
 *
 * Two signals are checked:
 *
 *   1. The version baked into the bundle versus the version in
 *      `apps/ava-cli/package.json`. This is exact, but it only fires when that
 *      version is actually bumped, and today it is pinned at `0.0.0`.
 *   2. Whether any source file is newer than the bundle. This is what catches
 *      the everyday case of editing a command and forgetting to rebuild, and it
 *      is why signal 1 alone is not enough.
 *
 * The staleness comparison is skipped when the running bundle lives outside
 * this repository, which happens when `ava` was built from another checkout or
 * worktree. Comparing mtimes across checkouts would report staleness constantly
 * (a fresh `git checkout` stamps every file with the current time) without
 * telling us anything about whether the code actually differs.
 */

export type CLIUpToDateResult =
  | Readonly<{ upToDate: true }>
  | Readonly<{ upToDate: false; reason: string }>;

/** Files whose change makes the bundle stale, alongside everything in src/. */
const EXTRA_SOURCE_FILES = ["package.json", "tsup.config.ts"] as const;

function readPackageVersion(packageJSONPath: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJSONPath, "utf8"));
    const version = (parsed as { version?: unknown }).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
}

function getModifiedTime(path: string): number | undefined {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
}

/** The most recent mtime anywhere under `dir`, or undefined when unreadable. */
function getNewestModifiedTime(dir: string): number | undefined {
  let newest: number | undefined = undefined;

  const visit = (currentDir: string): void => {
    let entries;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
        continue;
      }
      const modifiedTime = getModifiedTime(entryPath);
      if (
        modifiedTime !== undefined &&
        (newest === undefined || modifiedTime > newest)
      ) {
        newest = modifiedTime;
      }
    }
  };

  visit(dir);
  return newest;
}

function isInsideDir(path: string, dir: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedDir = resolve(dir);
  return (
    resolvedPath === resolvedDir || resolvedPath.startsWith(resolvedDir + sep)
  );
}

export function checkCLIIsUpToDate(options: {
  /** The repo the user is standing in, or undefined when outside one. */
  repoRoot: string | undefined;
  /** Version baked into the running bundle, or undefined when unbaked. */
  builtVersion: string | undefined;
  /** Path of the running bundle, or undefined when it cannot be determined. */
  bundlePath: string | undefined;
}): CLIUpToDateResult {
  const { repoRoot, builtVersion, bundlePath } = options;

  // Outside the monorepo there is no source to compare against.
  if (repoRoot === undefined) {
    return { upToDate: true };
  }

  const cliDir = join(repoRoot, "apps/ava-cli");
  const sourceVersion = readPackageVersion(join(cliDir, "package.json"));
  if (sourceVersion === undefined) {
    return { upToDate: true };
  }

  if (builtVersion !== undefined && builtVersion !== sourceVersion) {
    return {
      upToDate: false,
      reason:
        `the running ava was built from version ${builtVersion}, but ` +
        `apps/ava-cli is now at version ${sourceVersion}`,
    };
  }

  const resolvedBundlePath = bundlePath ?? join(cliDir, "dist/main.cjs");
  const bundleModifiedTime = getModifiedTime(resolvedBundlePath);
  if (bundleModifiedTime === undefined) {
    return {
      upToDate: false,
      reason: `the ava bundle is missing at ${resolvedBundlePath}`,
    };
  }

  // A bundle from another checkout tells us nothing by its mtime; see the note
  // at the top of this file.
  if (!isInsideDir(resolvedBundlePath, repoRoot)) {
    return { upToDate: true };
  }

  const sourceTimes = [
    getNewestModifiedTime(join(cliDir, "src")),
    ...EXTRA_SOURCE_FILES.map((file) => {
      return getModifiedTime(join(cliDir, file));
    }),
  ].filter((time): time is number => {
    return time !== undefined;
  });

  const newestSourceTime =
    sourceTimes.length > 0 ? Math.max(...sourceTimes) : undefined;
  if (newestSourceTime !== undefined && newestSourceTime > bundleModifiedTime) {
    return {
      upToDate: false,
      reason:
        "apps/ava-cli has source changes that are newer than the built ava",
    };
  }

  return { upToDate: true };
}
