import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { buildChangesetMarkdown } from "./buildChangesetMarkdown/buildChangesetMarkdown";
import { changedFilesToPackageNames } from "./changedFilesToPackageNames/changedFilesToPackageNames";
import { inferBumpType } from "./inferBumpType/inferBumpType";
import type { SemverBump } from "./inferBumpType/inferBumpType";

const REPO_ROOT = process.cwd();
const CHANGESET_DIR = join(REPO_ROOT, ".changeset");
const PACKAGE_TIERS = ["node", "shared", "web"];
const ZERO_SHA = "0000000000000000000000000000000000000000";

type MergedPullRequest = {
  number: number;
  title: string;
  body: string;
  branchName: string;
};

function warn(message: string): void {
  console.log(`::warning::${message}`);
}

function runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function runGh(args: string[]): string {
  return execFileSync("gh", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

/** Whether ancestorSha is an ancestor of descendantSha (fast-forward). */
function isAncestor(ancestorSha: string, descendantSha: string): boolean {
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
function loadPackageDirToName(): Map<string, string> {
  const packageDirToName = new Map<string, string>();
  for (const tier of PACKAGE_TIERS) {
    const tierDir = join(REPO_ROOT, "packages", tier);
    if (!existsSync(tierDir)) {
      continue;
    }
    for (const packageDirName of readdirSync(tierDir)) {
      const packageJsonPath = join(tierDir, packageDirName, "package.json");
      if (!existsSync(packageJsonPath)) {
        continue;
      }
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8"),
      ) as { name: string };
      packageDirToName.set(
        `packages/${tier}/${packageDirName}`,
        packageJson.name,
      );
    }
  }
  return packageDirToName;
}

/**
 * Reads the current version's major digit from any one fixed-group
 * package, since they're locked together.
 */
function readCurrentMajorVersion(
  packageDirToName: Map<string, string>,
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

function hasManualChangeset(changedFiles: string[]): boolean {
  return changedFiles.some((filePath) => {
    return (
      filePath.startsWith(".changeset/") && filePath.endsWith(".md")
    );
  });
}

function writeChangesetFile(
  changesetPath: string,
  packageNames: string[],
  bump: SemverBump,
  summary: string,
): void {
  mkdirSync(CHANGESET_DIR, { recursive: true });
  writeFileSync(
    changesetPath,
    buildChangesetMarkdown({ packageNames, bump, summary }),
  );
}

/**
 * Resolves each commit to its merged PR, bucketing commits with none
 * (a direct push).
 */
function partitionCommitsByPullRequest(commitShas: string[]): {
  prNumbers: Set<number>;
  unassociatedShas: string[];
} {
  const prNumbers = new Set<number>();
  const unassociatedShas: string[] = [];
  for (const sha of commitShas) {
    const output = runGh([
      "api",
      `repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}/pulls`,
      "--jq",
      ".[] | select(.merged_at != null) | .number",
    ]);
    const matchedNumbers = output.split("\n").filter(Boolean).map(Number);
    if (matchedNumbers.length === 0) {
      unassociatedShas.push(sha);
    } else {
      matchedNumbers.forEach((number) => {
        prNumbers.add(number);
      });
    }
  }
  return { prNumbers, unassociatedShas };
}

function fetchPullRequest(number: number): MergedPullRequest {
  const pullRequest = JSON.parse(
    runGh(["api", `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}`]),
  ) as { title: string; body: string | null; head: { ref: string } };
  return {
    number,
    title: pullRequest.title,
    body: pullRequest.body ?? "",
    branchName: pullRequest.head.ref,
  };
}

function fetchPullRequestFiles(number: number): string[] {
  return runGh([
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/pulls/${number}/files`,
    "--paginate",
    "--jq",
    ".[].filename",
  ])
    .split("\n")
    .filter(Boolean);
}

function processPullRequest(
  prNumber: number,
  packageDirToName: Map<string, string>,
  currentMajorVersion: number,
): boolean {
  const changesetPath = join(CHANGESET_DIR, `auto-pr-${prNumber}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = fetchPullRequestFiles(prNumber);
  if (hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = changedFilesToPackageNames(
    changedFiles,
    packageDirToName,
  );
  if (packageNames.length === 0) {
    return false;
  }

  const pullRequest = fetchPullRequest(prNumber);
  const bump = inferBumpType({
    prTitle: pullRequest.title,
    prBody: pullRequest.body,
    branchName: pullRequest.branchName,
    currentMajorVersion,
  });

  writeChangesetFile(
    changesetPath,
    packageNames,
    bump,
    `${pullRequest.title} (#${prNumber})`,
  );
  return true;
}

function processUnassociatedCommit(
  sha: string,
  packageDirToName: Map<string, string>,
  currentMajorVersion: number,
): boolean {
  const shortSha = sha.slice(0, 7);
  const changesetPath = join(CHANGESET_DIR, `auto-commit-${shortSha}.md`);
  if (existsSync(changesetPath)) {
    return false;
  }

  const changedFiles = runGit(["show", "--name-only", "--format=", sha])
    .split("\n")
    .filter(Boolean);
  if (hasManualChangeset(changedFiles)) {
    return false;
  }

  const packageNames = changedFilesToPackageNames(
    changedFiles,
    packageDirToName,
  );
  if (packageNames.length === 0) {
    return false;
  }

  const subject = runGit(["log", "-1", "--format=%s", sha]);
  const bump = inferBumpType({
    prTitle: subject,
    prBody: "",
    branchName: "",
    currentMajorVersion,
  });

  writeChangesetFile(
    changesetPath,
    packageNames,
    bump,
    `${subject} (${shortSha})`,
  );
  return true;
}

function main(): void {
  const beforeSha = process.env.BEFORE_SHA;
  const afterSha = process.env.AFTER_SHA;

  if (!beforeSha || !afterSha || beforeSha === ZERO_SHA) {
    warn(
      "No usable push range (new branch or missing SHAs); skipping auto-changeset generation.",
    );
    return;
  }

  if (!isAncestor(beforeSha, afterSha)) {
    warn(
      "Push range is not a fast-forward (force-push); skipping auto-changeset generation.",
    );
    return;
  }

  const commitShas = runGit(["log", "--format=%H", `${beforeSha}..${afterSha}`])
    .split("\n")
    .filter(Boolean);
  if (commitShas.length === 0) {
    return;
  }

  const packageDirToName = loadPackageDirToName();
  const currentMajorVersion = readCurrentMajorVersion(packageDirToName);
  const { prNumbers, unassociatedShas } =
    partitionCommitsByPullRequest(commitShas);

  const descriptions: string[] = [];

  for (const prNumber of prNumbers) {
    if (processPullRequest(prNumber, packageDirToName, currentMajorVersion)) {
      descriptions.push(`#${prNumber}`);
    }
  }
  for (const sha of unassociatedShas) {
    if (
      processUnassociatedCommit(sha, packageDirToName, currentMajorVersion)
    ) {
      descriptions.push(sha.slice(0, 7));
    }
  }

  if (descriptions.length === 0) {
    return;
  }

  runGit(["add", ".changeset"]);
  runGit([
    "commit",
    "-m",
    `chore: add changesets for ${descriptions.join(", ")} [skip deploy]`,
  ]);
  runGit(["push", "origin", "HEAD:develop"]);
}

try {
  main();
} catch (error) {
  warn(`Auto-changeset generation failed: ${(error as Error).message}`);
}
