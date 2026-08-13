import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { isDefined } from "@avandar/utils";
import type { Dirent } from "node:fs";

/** Whether the running `ava` matches the source, and why not if it does not. */
export type CLIUpToDateResult =
  | { upToDate: true }
  | { upToDate: false; reason: string };

/** Files whose change makes the bundle stale, alongside everything in src/. */
const EXTRA_SOURCE_FILES = ["package.json", "tsup.config.ts"] as const;

/** What the check needs to compare the running CLI against the source. */
export type CLIUpToDateOptions = {
  /** The repo the user is standing in, or undefined when outside one. */
  repoRoot: string | undefined;
  /** Version baked into the running bundle, or undefined when unbaked. */
  builtVersion: string | undefined;
  /** Path of the running bundle, or undefined when it cannot be determined. */
  bundlePath: string | undefined;
};

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
 * @returns `{ upToDate: true }` when it is safe to run a command, otherwise the
 * reason to show the user.
 */
export function checkCLIIsUpToDate(
  options: Readonly<CLIUpToDateOptions>,
): CLIUpToDateResult {
  const { repoRoot, builtVersion, bundlePath } = options;

  // Outside the monorepo there is no source to compare against.
  if (repoRoot === undefined) {
    return { upToDate: true };
  }

  const cliDir = join(repoRoot, "apps/ava-cli");
  const sourceVersion = _readPackageVersion(join(cliDir, "package.json"));
  if (sourceVersion === undefined) {
    return { upToDate: true };
  }

  if (builtVersion !== undefined && builtVersion !== sourceVersion) {
    return {
      upToDate: false,
      reason: `the running ava was built from version ${builtVersion}, but apps/ava-cli is now at version ${sourceVersion}`,
    };
  }
  return _checkBundleIsNewerThanSource({
    cliDir,
    repoRoot,
    bundlePath: bundlePath ?? join(cliDir, "dist/main.cjs"),
  });
}

/** Signal 2: whether the bundle is present and newer than every source file. */
function _checkBundleIsNewerThanSource(
  options: Readonly<{ cliDir: string; repoRoot: string; bundlePath: string }>,
): CLIUpToDateResult {
  const { cliDir, repoRoot, bundlePath } = options;

  const bundleModifiedTime = _getModifiedTime(bundlePath);
  if (bundleModifiedTime === undefined) {
    return {
      upToDate: false,
      reason: `the ava bundle is missing at ${bundlePath}`,
    };
  }

  // A bundle built from another checkout or worktree tells us nothing by its
  // mtime: a fresh `git checkout` stamps every file with the current time, so
  // comparing across checkouts would report staleness constantly without saying
  // anything about whether the code differs.
  if (!_isInsideDir(bundlePath, repoRoot)) {
    return { upToDate: true };
  }

  const newestSourceTime = _getNewestSourceTime(cliDir);
  if (isDefined(newestSourceTime) && newestSourceTime > bundleModifiedTime) {
    return {
      upToDate: false,
      reason:
        "apps/ava-cli has source changes that are newer than the built ava",
    };
  }
  return { upToDate: true };
}

/** The version in a package.json, or undefined when it cannot be read. */
function _readPackageVersion(packageJsonPath: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const version = (parsed as { version?: unknown }).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
}

/** A file's mtime in ms, or undefined when it cannot be stat'd. */
function _getModifiedTime(path: string): number | undefined {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
}

/** A directory's entries, or an empty list when it cannot be read. */
function _readEntries(dir: string): readonly Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Every mtime under `dir`, recursively. */
function _collectModifiedTimes(dir: string): number[] {
  return _readEntries(dir).flatMap((entry): number[] => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return _collectModifiedTimes(entryPath);
    }
    return [_getModifiedTime(entryPath)].filter(isDefined);
  });
}

/**
 * The newest mtime across the CLI's sources: everything under `src/` plus the
 * files whose change also invalidates the bundle.
 */
function _getNewestSourceTime(cliDir: string): number | undefined {
  const sourceTimes = [
    ..._collectModifiedTimes(join(cliDir, "src")),
    ...EXTRA_SOURCE_FILES.map((file) => {
      return _getModifiedTime(join(cliDir, file));
    }).filter(isDefined),
  ];
  return sourceTimes.length > 0 ? Math.max(...sourceTimes) : undefined;
}

/** Whether `path` is `dir` itself or sits somewhere beneath it. */
function _isInsideDir(path: string, dir: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedDir = resolve(dir);
  return (
    resolvedPath === resolvedDir || resolvedPath.startsWith(resolvedDir + sep)
  );
}
