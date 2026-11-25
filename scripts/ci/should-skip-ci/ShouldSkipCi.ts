import { execFileSync } from "node:child_process";
import { appendFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SKIP_DEPLOY_TOKEN = "[skip deploy]";
const SYMLINK_MODE = "120000";
const GIT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const ALL_ZERO_SHA_PATTERN = /^0+$/;
const SAFE_BASENAMES = new Set(["AGENTS.md", "CLAUDE.md", "README.md"]);
const SAFE_MARKDOWN_PREFIXES = [
  "docs/",
  "agent-skills/",
  ".agents/",
  ".claude/skills/",
  ".cursor/skills/",
  ".opencode/skills/",
] as const;
const SKILL_SYMLINK_PATTERN =
  /^\.(?:agents|claude|cursor|opencode)\/skills\/[^/]+$/;

/** One changed path reported by `git diff-tree --raw -r --no-renames -z`. */
export type FileChangeEntry = {
  oldMode: string;
  newMode: string;
  status: string;
  filePath: string;
};

/** Commit header parsed from `git log --format=%H%x1f%P%x1f%s`. */
export type CommitLogEntry = {
  sha: string;
  parentShas: readonly string[];
  subject: string;
};

/** Commit subject paired with its changed file entries for skip evaluation. */
export type CommitRecord = {
  sha: string;
  subject: string;
  changes: readonly FileChangeEntry[];
};

/** Result of checking whether a push or pull request should skip CI runs. */
export type SkipDecision = {
  shouldSkip: boolean;
  reason: string;
};

/** Inputs read from GitHub Actions environment or passed directly in tests. */
export type CheckSkipEnv = {
  eventName: string;
  beforeSha?: string;
  afterSha?: string;
  prBaseSha?: string;
  prHeadSha?: string;
  githubOutputPath?: string;
  repoDir?: string;
};

type CommitRangeResult =
  | { baseSha: string; headSha: string }
  | { failReason: string };

function _hasUnsafePathSegment(filePath: string): boolean {
  if (filePath.length === 0 || filePath.startsWith("/")) {
    return true;
  }
  return filePath.split("/").some((segment) => {
    return segment === "" || segment === "." || segment === "..";
  });
}

function _isSymlinkModeForStatus(entry: FileChangeEntry): boolean {
  if (entry.status === "A") {
    return entry.newMode === SYMLINK_MODE;
  }
  if (entry.status === "D") {
    return entry.oldMode === SYMLINK_MODE;
  }
  return entry.oldMode === SYMLINK_MODE && entry.newMode === SYMLINK_MODE;
}

function _isSafeFileChange(entry: FileChangeEntry): boolean {
  if (_hasUnsafePathSegment(entry.filePath)) {
    return false;
  }
  const basename = entry.filePath.split("/").at(-1);
  if (basename !== undefined && SAFE_BASENAMES.has(basename)) {
    return true;
  }
  if (entry.filePath.endsWith(".md")) {
    return SAFE_MARKDOWN_PREFIXES.some((prefix) => {
      return entry.filePath.startsWith(prefix);
    });
  }
  return (
    SKILL_SYMLINK_PATTERN.test(entry.filePath) && _isSymlinkModeForStatus(entry)
  );
}

function _parseDiffTreeRaw(rawOutput: string): FileChangeEntry[] {
  if (rawOutput.length === 0) {
    return [];
  }
  const tokens = rawOutput.split("\0");
  // Each `--raw --no-renames -z` entry is a metadata token + path token pair.
  const pairIndices = Array.from(
    { length: Math.floor(tokens.length / 2) },
    (_, pairIndex) => {
      return pairIndex * 2;
    },
  );
  return pairIndices.flatMap((tokenIndex) => {
    const metadata = tokens[tokenIndex];
    const filePath = tokens[tokenIndex + 1];
    if (
      metadata === undefined ||
      filePath === undefined ||
      !metadata.startsWith(":")
    ) {
      return [];
    }
    const parts = metadata.slice(1).split(" ");
    const [oldMode, newMode, , , status] = parts;
    if (
      oldMode === undefined ||
      newMode === undefined ||
      status === undefined
    ) {
      return [];
    }
    return [{ oldMode, newMode, status, filePath }];
  });
}

function _parseCommitLog(logOutput: string): CommitLogEntry[] {
  if (logOutput.trim().length === 0) {
    return [];
  }
  return logOutput
    .split("\n")
    .filter((line) => {
      return line.length > 0;
    })
    .map((line) => {
      const [sha = "", parentField = "", ...subjectParts] = line.split("\x1f");
      const parentShas = parentField.split(" ").filter((parentSha) => {
        return parentSha.length > 0;
      });
      return {
        sha,
        parentShas,
        subject: subjectParts.join("\x1f"),
      };
    });
}

function _isCommitSkippable(commit: CommitRecord): boolean {
  if (commit.subject.includes(SKIP_DEPLOY_TOKEN)) {
    return true;
  }
  if (commit.changes.length === 0) {
    return false;
  }
  return commit.changes.every((entry) => {
    return _isSafeFileChange(entry);
  });
}

function _shouldSkipCommits(commits: readonly CommitRecord[]): SkipDecision {
  if (commits.length === 0) {
    return {
      shouldSkip: false,
      reason: "No commits found in range; running CI.",
    };
  }
  const blockingCommit = commits.find((commit) => {
    return !_isCommitSkippable(commit);
  });
  if (blockingCommit !== undefined) {
    return {
      shouldSkip: false,
      reason: `Commit ${blockingCommit.sha.slice(0, 7)} requires CI.`,
    };
  }
  return {
    shouldSkip: true,
    reason: `All ${commits.length} commit(s) qualify for skip.`,
  };
}

function _isUsableSha(sha: string | undefined): sha is string {
  return sha !== undefined && sha.length > 0 && !ALL_ZERO_SHA_PATTERN.test(sha);
}

function _getRangeFromEnv(options: CheckSkipEnv): CommitRangeResult {
  if (options.eventName === "push") {
    const { beforeSha, afterSha } = options;
    if (!_isUsableSha(beforeSha) || !_isUsableSha(afterSha)) {
      return { failReason: "Push commit range is missing or all zeros." };
    }
    return { baseSha: beforeSha, headSha: afterSha };
  }
  if (options.eventName === "pull_request") {
    const { prBaseSha, prHeadSha } = options;
    if (!_isUsableSha(prBaseSha) || !_isUsableSha(prHeadSha)) {
      return { failReason: "Pull request base or head SHA is missing." };
    }
    return { baseSha: prBaseSha, headSha: prHeadSha };
  }
  return {
    failReason: `Event "${options.eventName}" is not eligible for skipping.`,
  };
}

function _runGitRaw(args: string[], repoDir: string): string {
  return execFileSync("git", args, {
    cwd: repoDir,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function _commitExists(sha: string, repoDir: string): boolean {
  try {
    _runGitRaw(["cat-file", "-e", `${sha}^{commit}`], repoDir);
    return true;
  } catch {
    return false;
  }
}

function _isAncestor(
  ancestorSha: string,
  descendantSha: string,
  repoDir: string,
): boolean {
  try {
    _runGitRaw(
      ["merge-base", "--is-ancestor", ancestorSha, descendantSha],
      repoDir,
    );
    return true;
  } catch {
    return false;
  }
}

function _loadCommitRecord(
  entry: CommitLogEntry,
  repoDir: string,
): CommitRecord {
  if (entry.subject.includes(SKIP_DEPLOY_TOKEN)) {
    return { sha: entry.sha, subject: entry.subject, changes: [] };
  }
  const rawDiff = _runGitRaw(
    [
      "diff-tree",
      "--raw",
      "-r",
      "--no-renames",
      "--no-commit-id",
      "-m",
      "--first-parent",
      "--root",
      "-z",
      entry.sha,
    ],
    repoDir,
  );
  return {
    sha: entry.sha,
    subject: entry.subject,
    changes: _parseDiffTreeRaw(rawDiff),
  };
}

function _evaluateLogEntries(
  entries: readonly CommitLogEntry[],
  repoDir: string,
): SkipDecision {
  if (entries.length === 0) {
    return {
      shouldSkip: false,
      reason: "No commits found in range; running CI.",
    };
  }
  // Stop at the first blocking commit to avoid diffing thousands of commits.
  const blockingEntry = entries.find((entry) => {
    return !_isCommitSkippable(_loadCommitRecord(entry, repoDir));
  });
  if (blockingEntry !== undefined) {
    return {
      shouldSkip: false,
      reason: `Commit ${blockingEntry.sha.slice(0, 7)} requires CI.`,
    };
  }
  return {
    shouldSkip: true,
    reason: `All ${entries.length} commit(s) qualify for skip.`,
  };
}

function _evaluateGitRange(options: CheckSkipEnv): SkipDecision {
  const range = _getRangeFromEnv(options);
  if ("failReason" in range) {
    return { shouldSkip: false, reason: range.failReason };
  }
  const repoDir = options.repoDir ?? process.cwd();
  try {
    if (
      !_commitExists(range.baseSha, repoDir) ||
      !_commitExists(range.headSha, repoDir)
    ) {
      return {
        shouldSkip: false,
        reason: "Base or head commit is not reachable in local git history.",
      };
    }
    if (
      options.eventName === "push" &&
      !_isAncestor(range.baseSha, range.headSha, repoDir)
    ) {
      return {
        shouldSkip: false,
        reason: "Push is not a fast-forward from base commit; running CI.",
      };
    }
    const logOutput = _runGitRaw(
      ["log", "--format=%H%x1f%P%x1f%s", `${range.baseSha}..${range.headSha}`],
      repoDir,
    );
    return _evaluateLogEntries(_parseCommitLog(logOutput), repoDir);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      shouldSkip: false,
      reason: `Git inspection failed; running CI (${message}).`,
    };
  }
}

function _runCli(options: CheckSkipEnv): SkipDecision {
  const decision = _evaluateGitRange(options);
  const singleLineReason = decision.reason.replaceAll(/[\r\n]+/g, " ");
  if (
    options.githubOutputPath !== undefined &&
    options.githubOutputPath.length > 0
  ) {
    appendFileSync(
      options.githubOutputPath,
      `should-skip=${decision.shouldSkip}\nreason=${singleLineReason}\n`,
    );
  }
  console.log(
    `[check-skip] should-skip=${decision.shouldSkip} (${singleLineReason})`,
  );
  return decision;
}

function _isDirectCliExecution(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined || invokedPath.length === 0) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(invokedPath)).href;
  } catch {
    return false;
  }
}

/**
 * Evaluates whether a pushed or pull-request commit range qualifies to skip
 * GitHub Actions workflows based on `[skip deploy]` subjects and safe
 * documentation or agent-skill file rules.
 *
 * Called by the `.github/actions/check-skip` composite action and verified by
 * `ShouldSkipCi.test.ts`.
 */
export const ShouldSkipCi = {
  isSafeFileChange: _isSafeFileChange,
  parseDiffTreeRaw: _parseDiffTreeRaw,
  parseCommitLog: _parseCommitLog,
  isCommitSkippable: _isCommitSkippable,
  shouldSkipCommits: _shouldSkipCommits,
  evaluateGitRange: _evaluateGitRange,
  runCli: _runCli,
};

if (_isDirectCliExecution()) {
  ShouldSkipCi.runCli({
    eventName: process.env.EVENT_NAME ?? "",
    beforeSha: process.env.BEFORE_SHA,
    afterSha: process.env.AFTER_SHA,
    prBaseSha: process.env.PR_BASE_SHA,
    prHeadSha: process.env.PR_HEAD_SHA,
    githubOutputPath: process.env.GITHUB_OUTPUT,
    repoDir: process.cwd(),
  });
}
