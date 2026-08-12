import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/releaseCommands";

/**
 * Git operations `ava release` needs, expressed in terms of what the release
 * means rather than in raw git verbs.
 */

/** Short form used in output. Full SHAs are printed only where they matter. */
export function shortSHA(sha: string): string {
  return sha.slice(0, 8);
}

/** The branch currently checked out, or undefined on a detached HEAD. */
export function getCurrentBranch(git: ReleaseCommands): string | undefined {
  const branch = git.readGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  return branch === "HEAD" ? undefined : branch;
}

/**
 * Tracked changes in the working tree or the index.
 *
 * Untracked files are deliberately excluded: this command never checks out a
 * branch and never cleans, so untracked files cannot reach the release. Tracked
 * modifications and staged changes are a different matter, because the version
 * commits use `git commit -a` and would sweep them in.
 */
export function getTrackedChanges(git: ReleaseCommands): string | undefined {
  const changes = git.readGit(["status", "--short", "--untracked-files=no"]);
  return changes !== undefined && changes.length > 0 ? changes : undefined;
}

export function revParse(
  git: ReleaseCommands,
  revision: string,
): string | undefined {
  return git.readGit(["rev-parse", "--verify", "--quiet", revision]);
}

/** Whether a local ref exists, without resolving it. */
export function refExists(git: ReleaseCommands, ref: string): boolean {
  return git.tryGit(["rev-parse", "--verify", "--quiet", ref]).ok;
}

export function localTagExists(git: ReleaseCommands, tag: string): boolean {
  return refExists(git, `refs/tags/${tag}`);
}

export function remoteTagExists(git: ReleaseCommands, tag: string): boolean {
  const output = git.readGit([
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`,
  ]);
  return output !== undefined && output.length > 0;
}

/** How far apart two refs are, in commits. */
export function getDivergence(
  git: ReleaseCommands,
  localRef: string,
  remoteRef: string,
): Readonly<{ ahead: number; behind: number }> {
  const ahead = git.readGit([
    "rev-list",
    "--count",
    `${remoteRef}..${localRef}`,
  ]);
  const behind = git.readGit([
    "rev-list",
    "--count",
    `${localRef}..${remoteRef}`,
  ]);
  return {
    ahead: Number.parseInt(ahead ?? "0", 10),
    behind: Number.parseInt(behind ?? "0", 10),
  };
}

/**
 * The worktree that has `branch` checked out, if any.
 *
 * Moving a branch ref while another worktree has it checked out makes that
 * worktree report every file as deleted, so the local ref update is skipped
 * when this returns a path.
 */
export function findWorktreeForBranch(
  git: ReleaseCommands,
  branch: string,
): string | undefined {
  const output = git.readGit(["worktree", "list", "--porcelain"]);
  if (output === undefined) {
    return undefined;
  }

  let currentWorktree: string | undefined = undefined;
  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      currentWorktree = line.slice("worktree ".length).trim();
    } else if (line.trim() === `branch refs/heads/${branch}`) {
      return currentWorktree;
    }
  }
  return undefined;
}

/** Reads the root package.json version at a git revision, without checkout. */
export function readVersionAtRevision(
  git: ReleaseCommands,
  revision: string,
): string | undefined {
  const contents = git.readGit(["show", `${revision}:package.json`]);
  if (contents === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(contents);
    const version = (parsed as { version?: unknown }).version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
}

/** The tree object a revision points at. Two equal trees mean equal content. */
export function readTreeSHA(
  git: ReleaseCommands,
  revision: string,
): string | undefined {
  return git.readGit(["rev-parse", `${revision}^{tree}`]);
}

/**
 * Builds the release commit: `develop`'s tree verbatim, with `main` and
 * `develop` as its two parents.
 *
 * This is the heart of the command, and the reason it cannot conflict. A
 * release is not a content merge; `main` is only ever a published snapshot of
 * `develop`, so the answer is always "take develop's tree, whole". Handing that
 * tree straight to `commit-tree` means no merge algorithm runs at all, so there
 * is nothing that can report a conflict, and no `-X theirs` or `git clean` is
 * needed to force the outcome.
 *
 * Because the commit still records `develop` as a parent, `develop` becomes a
 * true ancestor of `main` and the merge base advances every release. That is
 * what the old squash-based flow never did, and why it re-derived conflicts
 * from an ancient merge base on every single release.
 *
 * Returns the new commit SHA, or undefined on a dry run (nothing was written).
 */
export function createReleaseCommit(
  git: ReleaseCommands,
  options: {
    releaseTreeSHA: string;
    mainParentSHA: string;
    developParentSHA: string;
    message: string;
  },
): string | undefined {
  const { releaseTreeSHA, mainParentSHA, developParentSHA, message } = options;

  const result = git.mutate("git", [
    "commit-tree",
    releaseTreeSHA,
    "-p",
    mainParentSHA,
    "-p",
    developParentSHA,
    "-m",
    message,
  ]);

  if (!result.ok) {
    throw new Error(`git commit-tree failed: ${result.stderr}`);
  }
  return result.stdout.length > 0 ? result.stdout : undefined;
}
