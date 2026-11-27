/** Temporary git repository helpers shared by the `ShouldSkipCi` test files. */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { FileChangeEntry } from "../ShouldSkipCi";

const tempDirs: string[] = [];

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test Bot",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test Bot",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function _git(repoDir: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args],
    {
      cwd: repoDir,
      encoding: "utf8",
      env: GIT_ENV,
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function _writeFile(repoDir: string, relativePath: string, body: string): void {
  const fullPath = join(repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, body);
}

function _writeSymlink(
  repoDir: string,
  relativePath: string,
  target: string,
): void {
  const fullPath = join(repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  symlinkSync(target, fullPath);
}

function _createTempRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), "should-skip-ci-"));
  tempDirs.push(repoDir);
  _git(repoDir, ["init", "-b", "develop"]);
  _writeFile(repoDir, "package.json", '{"version":"0.15.0"}\n');
  _git(repoDir, ["add", "."]);
  _git(repoDir, ["commit", "-m", "chore: initial commit"]);
  return repoDir;
}

function _commitAll(repoDir: string, message: string): string {
  _git(repoDir, ["add", "-A"]);
  _git(repoDir, ["commit", "-m", message]);
  return _git(repoDir, ["rev-parse", "HEAD"]);
}

function _cleanupTempDirs(): void {
  tempDirs.splice(0).forEach((dirPath) => {
    rmSync(dirPath, { recursive: true, force: true });
  });
}

function _makeFileEntry(
  filePath: string,
  overrides: Partial<Omit<FileChangeEntry, "filePath">> = {},
): FileChangeEntry {
  return {
    oldMode: overrides.oldMode ?? "100644",
    newMode: overrides.newMode ?? "100644",
    status: overrides.status ?? "M",
    filePath,
  };
}

/**
 * Helpers that build throwaway git repositories and commits for the
 * `ShouldSkipCi` tests. Call `cleanupTempDirs` from an `afterEach`.
 */
export const ShouldSkipCiFixtures = {
  GIT_ENV,
  git: _git,
  writeFile: _writeFile,
  writeSymlink: _writeSymlink,
  createTempRepo: _createTempRepo,
  commitAll: _commitAll,
  cleanupTempDirs: _cleanupTempDirs,
  makeFileEntry: _makeFileEntry,
};
