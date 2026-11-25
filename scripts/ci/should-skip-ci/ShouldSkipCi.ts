const SKIP_DEPLOY_TOKEN = "[skip deploy]";
const SYMLINK_MODE = "120000";
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
    SKILL_SYMLINK_PATTERN.test(entry.filePath) &&
    _isSymlinkModeForStatus(entry)
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
};
