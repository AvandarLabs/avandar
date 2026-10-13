import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { getPackageNamesFromChangedFiles } from "./getPackageNamesFromChangedFiles/getPackageNamesFromChangedFiles";
import { inferBumpType } from "./inferBumpType/inferBumpType";
import type { SemverBump } from "./inferBumpType/inferBumpType";
import { makeChangesetMarkdown } from "./makeChangesetMarkdown/makeChangesetMarkdown";

const REPO_ROOT = process.cwd();
const CHANGESET_DIR = join(REPO_ROOT, ".changeset");
const PACKAGE_TIERS = ["node", "shared", "web"] as const;
const ZERO_SHA = "0000000000000000000000000000000000000000";

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

/** Whether ancestorSha is an ancestor of descendantSha (fast-forward). */
function _isAncestor(options: {
  ancestorSha: string;
  descendantSha: string;
}): boolean {
  const { ancestorSha, descendantSha } = options;
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", ancestorSha, descendantSha],
      { cwd: REPO_ROOT },
    );
    return true;
  } catch {
    return false;
  }
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

function _main(): void {
  const beforeSha = process.env.BEFORE_SHA;
  const afterSha = process.env.AFTER_SHA;

  if (!beforeSha || !afterSha || beforeSha === ZERO_SHA) {
    _warn(
      "No usable push range (new branch or missing SHAs); skipping auto-changeset generation.",
    );
    return;
  }

  if (!_isAncestor({ ancestorSha: beforeSha, descendantSha: afterSha })) {
    _warn(
      "Push range is not a fast-forward (force-push); skipping auto-changeset generation.",
    );
    return;
  }

  const commitShas = _runGit([
    "log",
    "--format=%H",
    `${beforeSha}..${afterSha}`,
  ])
    .split("\n")
    .filter(Boolean);
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

  _runGit(["add", ".changeset"]);
  _runGit([
    "commit",
    "-m",
    `chore: add changesets for ${descriptions.join(", ")} [skip deploy]`,
  ]);
  _runGit(["push", "origin", "HEAD:develop"]);
}

try {
  _main();
} catch (error) {
  _warn(`Auto-changeset generation failed: ${(error as Error).message}`);
}
