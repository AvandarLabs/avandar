import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { MigrationsSnapshot } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/runMigrationChecks/runMigrationChecks.types";

const MIGRATIONS_DIR = path.join("supabase", "migrations");
const CONFIG_TOML = path.join("supabase", "config.toml");

/** Run git and return trimmed stdout, or undefined when the command fails. */
function _readGit(repoRoot: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

/** Lines of git output, with the blank trailing line dropped. */
function _readGitLines(repoRoot: string, args: string[]): string[] {
  const output = _readGit(repoRoot, args);
  return output === undefined || output.length === 0 ? [] : output.split("\n");
}

/**
 * The base branch to compare against: `origin/develop` when the remote ref is
 * present, otherwise local `develop`.
 *
 * `origin/develop` is preferred because it is what the branch will actually
 * merge into. A stale local `develop` is the exact situation that hides an
 * ordering conflict.
 */
function _findBaseRef(repoRoot: string): string | undefined {
  const candidates = ["origin/develop", "develop", "origin/main", "main"];
  return candidates.find((ref) => {
    return (
      _readGit(repoRoot, ["rev-parse", "--verify", "--quiet", ref]) !==
      undefined
    );
  });
}

/** Migration basenames recorded on `ref`. */
function _readMigrationsOnRef(repoRoot: string, ref: string): string[] {
  return _readGitLines(repoRoot, [
    "ls-tree",
    "--name-only",
    ref,
    `${MIGRATIONS_DIR}/`,
  ])
    .map((filePath) => {
      return path.basename(filePath);
    })
    .filter((filename) => {
      return filename.endsWith(".sql");
    });
}

/** Migration basenames present in the working tree. */
function _readMigrationsInWorkingTree(repoRoot: string): string[] {
  const dir = path.join(repoRoot, MIGRATIONS_DIR);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).filter((filename) => {
    return filename.endsWith(".sql");
  });
}

/**
 * Migrations that exist on `baseRef` and differ in this branch.
 *
 * Compared against the merge base rather than the branch tip, so a migration
 * someone else added after this branch started is not reported as an edit.
 */
function _readModifiedExistingMigrations(
  options: Readonly<{
    repoRoot: string;
    baseRef: string;
    migrationsOnBase: Set<string>;
  }>,
): string[] {
  const { repoRoot, baseRef, migrationsOnBase } = options;
  const mergeBase = _readGit(repoRoot, ["merge-base", baseRef, "HEAD"]);
  if (mergeBase === undefined) {
    return [];
  }

  return _readGitLines(repoRoot, [
    "diff",
    "--name-only",
    "--diff-filter=MDR",
    mergeBase,
    "--",
    `${MIGRATIONS_DIR}/`,
  ])
    .map((filePath) => {
      return path.basename(filePath);
    })
    .filter((filename) => {
      return migrationsOnBase.has(filename);
    });
}

/** Contents of each migration this branch adds, keyed by basename. */
function _readNewMigrationContents(
  options: Readonly<{
    repoRoot: string;
    workingTreeMigrations: string[];
    migrationsOnBase: Set<string>;
  }>,
): Record<string, string> {
  const { repoRoot, workingTreeMigrations, migrationsOnBase } = options;
  return Object.fromEntries(
    workingTreeMigrations
      .filter((filename) => {
        return !migrationsOnBase.has(filename);
      })
      .map((filename) => {
        return [
          filename,
          readFileSync(path.join(repoRoot, MIGRATIONS_DIR, filename), "utf-8"),
        ];
      }),
  );
}

/**
 * Read everything the checks need from git and disk.
 *
 * Returns undefined when the base branch cannot be resolved, which means there
 * is nothing meaningful to compare against.
 */
export function readMigrationsSnapshot(
  repoRoot: string,
  now: Date = new Date(),
): MigrationsSnapshot | undefined {
  const baseRef = _findBaseRef(repoRoot);
  if (baseRef === undefined) {
    return undefined;
  }

  const currentBranch = _readGit(repoRoot, [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  const baseBranchMigrations = _readMigrationsOnRef(repoRoot, baseRef);
  const workingTreeMigrations = _readMigrationsInWorkingTree(repoRoot);
  const migrationsOnBase = new Set(baseBranchMigrations);

  const configTomlPath = path.join(repoRoot, CONFIG_TOML);

  return {
    baseBranch: baseRef,
    currentBranch: currentBranch === "HEAD" ? undefined : currentBranch,
    workingTreeMigrations,
    baseBranchMigrations,
    modifiedExistingMigrations: _readModifiedExistingMigrations({
      repoRoot,
      baseRef,
      migrationsOnBase,
    }),
    newMigrationContents: _readNewMigrationContents({
      repoRoot,
      workingTreeMigrations,
      migrationsOnBase,
    }),
    configToml:
      existsSync(configTomlPath) ? readFileSync(configTomlPath, "utf-8") : "",
    now,
  };
}
