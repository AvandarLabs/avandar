import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { findLastReleaseCommitSha } from "./findLastReleaseCommitSha/findLastReleaseCommitSha";
import { getPackageNamesFromChangedFiles } from "./getPackageNamesFromChangedFiles/getPackageNamesFromChangedFiles";
import { inferBumpType } from "./inferBumpType/inferBumpType";
import { makeChangesetMarkdown } from "./makeChangesetMarkdown/makeChangesetMarkdown";
import type { CommitSummary } from "./findLastReleaseCommitSha/findLastReleaseCommitSha";
import type { SemverBump } from "./inferBumpType/inferBumpType";

const REPO_ROOT = process.cwd();
const CHANGESET_DIR = join(REPO_ROOT, ".changeset");
const PACKAGE_TIERS = ["node", "shared", "web"] as const;

type MergedPullRequest = {
  number: number;
  title: string;
  body: string;
  branchName: string;
};

function _warn(message: string): void {
  console.log(`::warning::${message}`);
}

function _runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function _runGh(args: string[]): string {
  return execFileSync("gh", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

/** Maps each `packages/<tier>/<name>` directory to its package.json name. */
function _loadPackageDirToName(): Map<string, string> {
  const packageDirEntries = PACKAGE_TIERS.flatMap((tier) => {
    const tierDir = join(REPO_ROOT, "packages", tier);
    if (!existsSync(tierDir)) {
      return [];
    }
    return readdirSync(tierDir)
      .map((packageDirName): [string, string] | undefined => {
        const packageJsonPath = join(tierDir, packageDirName, "package.json");
        if (!existsSync(packageJsonPath)) {
          return undefined;
        }
        const packageJson = JSON.parse(
          readFileSync(packageJsonPath, "utf8"),
        ) as { name: string };
        return [`packages/${tier}/${packageDirName}`, packageJson.name];
      })
      .filter((entry): entry is [string, string] => {
        return entry !== undefined;
      });
  });
  return new Map(packageDirEntries);
}

/**
 * Reads the current version's major digit from any one fixed-group
 * package, since they're locked together.
 */
function _readCurrentMajorVersion(
  packageDirToName: ReadonlyMap<string, string>,
): number {
  const [firstPackageDir] = packageDirToName.keys();
  if (firstPackageDir === undefined) {
    throw new Error("No packages found under packages/**.");
  }
  const packageJson = JSON.parse(
    readFileSync(join(REPO_ROOT, firstPackageDir, "package.json"), "utf8"),
  ) as { version: string };
  return Number(packageJson.version.split(".")[0]);
}

function _hasManualChangeset(changedFiles: string[]): boolean {
  return changedFiles.some((filePath) => {
    return filePath.startsWith(".changeset/") && filePath.endsWith(".md");
  });
}

function _writeChangesetFile(options: {
  changesetPath: string;
  packageNames: readonly string[];
  bump: SemverBump;
  summary: string;
}): void {
  const { changesetPath, packageNames, bump, summary } = options;
  mkdirSync(CHANGESET_DIR, { recursive: true });
  writeFileSync(
    changesetPath,
    makeChangesetMarkdown({ packageNames, bump, summary }),
  );
}

/**
 * Resolves each commit to its merged PR, bucketing commits with none
 * (a direct push).
 */
function _partitionCommitsByPullRequest(commitShas: string[]): {
  prNumbers: Set<number>;
  unassociatedShas: string[];
} {
  const commitPullRequestNumbers = commitShas.map((sha) => {
    const output = _runGh([
      "api",
      `repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}/pulls`,
      "--jq",
      ".[] | select(.merged_at != null) | .number",
    ]);
    return {
      sha,
      prNumbers: output.split("\n").filter(Boolean).map(Number),
    };
  });

  const prNumbers = new Set(
    commitPullRequestNumbers.flatMap((commit) => {
      return commit.prNumbers;
    }),
  );
  const unassociatedShas = commitPullRequestNumbers
    .filter((commit) => {
      return commit.prNumbers.length === 0;
    })
    .map((commit) => {
      return commit.sha;
    });

  return { prNumbers, unassociatedShas };
}

function _fetchPullRequest(number: number): MergedPullRequest {
  const pullRequest = JSON.parse(
    _runGh(["api", `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}`]),
  ) as { title: string; body: string | null; head: { ref: string } };
  return {
    number,
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    branchName: pullRequest.head.ref,
  };
}

function _fetchPullRequestFiles(number: number): string[] {
  return _runGh([
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}/files`,
    "--paginate",
    "--jq",
    ".[].filename",
  ])
    .split("\n")
    .filter(Boolean);
}

function _processPullRequest(options: {
  prNumber: number;
  packageDirToName: ReadonlyMap<string, string>;
  currentMajorVersion: number;
}): boolean {
  const { prNumber, packageDirToName, currentMajorVersion } = options;
  const changesetPath = join(CHANGESET_DIR, `auto-pr-${prNumber}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = _fetchPullRequestFiles(prNumber);
  if (_hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = getPackageNamesFromChangedFiles({
    changedFilePaths: changedFiles,
    packageDirToName,
  });
  if (packageNames.length === 0) {
    return false;
  }

  const pullRequest = _fetchPullRequest(prNumber);
  const bump = inferBumpType({
    prTitle: pullRequest.title,
    prBody: pullRequest.body,
    branchName: pullRequest.branchName,
    currentMajorVersion,
  });

  _writeChangesetFile({
    changesetPath,
    packageNames,
    bump,
    summary: `${pullRequest.title} (#${prNumber})`,
  });
  return true;
}

function _processUnassociatedCommit(options: {
  sha: string;
  packageDirToName: ReadonlyMap<string, string>;
  currentMajorVersion: number;
}): boolean {
  const { sha, packageDirToName, currentMajorVersion } = options;
  const shortSha = sha.slice(0, 7);
  const changesetPath = join(CHANGESET_DIR, `auto-commit-${shortSha}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = _runGit(["diff", "--name-only", `${sha}^`, sha])
    .split("\n")
    .filter(Boolean);
  if (_hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = getPackageNamesFromChangedFiles({
    changedFilePaths: changedFiles,
    packageDirToName,
  });
  if (packageNames.length === 0) {
    return false;
  }

  const subject = _runGit(["log", "-1", "--format=%s", sha]);
  const bump = inferBumpType({
    prTitle: subject,
    prBody: "",
    branchName: "",
    currentMajorVersion,
  });

  _writeChangesetFile({
    changesetPath,
    packageNames,
    bump,
    summary: `${subject} (${shortSha})`,
  });
  return true;
}

/** Lists every commit reachable from HEAD, newest first. */
function _loadCommitSummaries(): CommitSummary[] {
  return _runGit(["log", "--format=%H%x09%s", "HEAD"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha = "", ...subjectParts] = line.split("\t");
      return { sha, subject: subjectParts.join("\t") };
    });
}

/**
 * Lists the non-merge commits since the last release that touch
 * `packages/**`. Merge commits are skipped because the commits they bring in
 * are listed on their own, and diffing a merge against its first parent can
 * sweep in another branch's changes.
 */
function _listUnreleasedPackageCommitShas(releaseSha: string): string[] {
  return _runGit([
    "rev-list",
    "--no-merges",
    "--full-history",
    `${releaseSha}..HEAD`,
    "--",
    "packages/",
  ])
    .split("\n")
    .filter(Boolean);
}

/**
 * Writes an untracked changeset for every change to `packages/**` since the
 * last version PR merged. The files are rebuilt on every run rather than
 * committed, because `develop` only accepts changes through a pull request.
 * `changesets/action` keeps untracked files when it resets the version
 * branch, so they still land in the version PR.
 */
function _main(): void {
  const releaseSha = findLastReleaseCommitSha(_loadCommitSummaries());
  if (releaseSha === undefined) {
    _warn(
      "No `Release: @avandar packages` commit found; skipping auto-changeset generation.",
    );
    return;
  }

  const commitShas = _listUnreleasedPackageCommitShas(releaseSha);
  if (commitShas.length === 0) {
    return;
  }

  const packageDirToName = _loadPackageDirToName();
  const currentMajorVersion = _readCurrentMajorVersion(packageDirToName);
  const { prNumbers, unassociatedShas } =
    _partitionCommitsByPullRequest(commitShas);

  const prDescriptions = [...prNumbers]
    .filter((prNumber) => {
      return _processPullRequest({
        prNumber,
        packageDirToName,
        currentMajorVersion,
      });
    })
    .map((prNumber) => {
      return `#${prNumber}`;
    });
  const commitDescriptions = unassociatedShas
    .filter((sha) => {
      return _processUnassociatedCommit({
        sha,
        packageDirToName,
        currentMajorVersion,
      });
    })
    .map((sha) => {
      return sha.slice(0, 7);
    });
  const descriptions = [...prDescriptions, ...commitDescriptions];

  if (descriptions.length === 0) {
    return;
  }

  console.log(`Wrote changesets for ${descriptions.join(", ")}.`);
}

try {
  _main();
} catch (error) {
  _warn(`Auto-changeset generation failed: ${(error as Error).message}`);
}
