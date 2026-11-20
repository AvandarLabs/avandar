import {
  createReleaseCommit,
  findWorktreeForBranch,
  localTagExists,
  readTreeSha,
  remoteTagExists,
  revParse,
  shortSha,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  printDetail,
  printHeading,
} from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers/releaseOutputHelpers";
import {
  printError,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

/**
 * The git/GitHub-mutating stages of a release, in the order `runRelease`
 * calls them.
 *
 * Each stage is self-contained and throws with a message that says exactly
 * what has and has not happened, so a failure half-way through is
 * recoverable. The read-only confirmation and reporting stages that sit
 * between these live in `releaseConfirmationStages.ts`.
 */

/**
 * The line, versions, and tag a release is being cut with, built once by
 * `runRelease` and read by every stage.
 */
export type ReleasePlan = {
  /** The line being released, which names every branch a stage touches. */
  line: ReleaseLine;
  /** The version on the source branch before the release, e.g. `0.10.2-dev`. */
  sourceVersion: string;
  /** The bare `X.Y.Z` being released, without the line's suffix. */
  releaseVersion: string;
  /** The version written to package.json, e.g. `0.10.2` or `0.15.0-alpha`. */
  publishedVersion: string;
  /** The bare `X.Y.Z` the source branch moves to, without the dev suffix. */
  nextVersion: string;
  /** The git tag, e.g. `v0.10.2` or `v0.15.0-alpha`. */
  releaseTag: string;
};

/**
 * Push the checked-out source branch to origin by its full ref, so a tag named
 * like the branch cannot make the destination ambiguous. Preflight has already
 * refused any other checked-out branch.
 */
function _pushSourceBranch(
  git: ReleaseCommands,
  line: ReleaseLine,
): CommandResult {
  return git.mutate("git", [
    "push",
    "origin",
    `HEAD:refs/heads/${line.sourceBranch}`,
  ]);
}

/** Refuse a tag that already exists locally or on origin. */
export function assertTagIsUnused(
  git: ReleaseCommands,
  plan: ReleasePlan,
): void {
  const { releaseTag, publishedVersion } = plan;

  if (localTagExists(git, releaseTag)) {
    throw new Error(
      `Tag ${releaseTag} already exists locally. Pick another version, or delete the tag.`,
    );
  }
  if (remoteTagExists(git, releaseTag)) {
    throw new Error(
      `Tag ${releaseTag} already exists on origin, so ${publishedVersion} has been released.`,
    );
  }
}

/**
 * Put the published release version (`0.10.2`, or `0.15.0-alpha` on alpha) on
 * the source branch and push it, so the released tree is one that exists on
 * that branch under its real version number.
 *
 * Returns the commit the release publishes.
 */
export function commitReleaseVersionOnSource(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; originSourceSha: string }>,
): string {
  const { plan, originSourceSha } = options;
  const { line, sourceVersion, publishedVersion, releaseTag } = plan;

  printHeading(`Setting ${line.sourceBranch} to ${publishedVersion}`);
  if (sourceVersion === publishedVersion) {
    printSuccess(
      `package.json is already ${publishedVersion}; nothing to commit.`,
    );
  } else {
    _commitVersion(git, {
      version: publishedVersion,
      message: `Release: ${releaseTag} [skip deploy]`,
    });
    const pushResult = _pushSourceBranch(git, line);
    if (!pushResult.ok) {
      throw new Error(
        `Could not push ${line.sourceBranch}: ${pushResult.stderr}
Nothing has been released. Fix the push and run the command again.`,
      );
    }
  }
  // On a dry run no commit was made, so the release commit is the branch tip.
  return git.dryRun
    ? originSourceSha
    : (revParse(git, "HEAD") ?? originSourceSha);
}

/**
 * Build the release commit from the source branch's tree, tag it, and push the
 * branch and tag atomically.
 *
 * Returns the new commit, or `undefined` on a dry run, where there is nothing
 * to tag or push.
 */
export function publishTargetAndTag(
  git: ReleaseCommands,
  options: Readonly<{
    plan: ReleasePlan;
    releaseSha: string;
    originTargetSha: string;
  }>,
): string | undefined {
  const { plan, releaseSha, originTargetSha } = options;
  const { line, releaseTag, nextVersion } = plan;

  printHeading(`Building ${line.targetBranch} from ${line.sourceBranch}`);
  const releaseTreeSha = readTreeSha(git, releaseSha);
  if (releaseTreeSha === undefined) {
    throw new Error(`Could not read the tree of ${shortSha(releaseSha)}.`);
  }
  const releaseCommitSha = createReleaseCommit(git, {
    releaseTreeSha,
    targetParentSha: originTargetSha,
    sourceParentSha: releaseSha,
    message: _buildReleaseCommitMessage({ plan, releaseSha }),
  });

  if (git.dryRun) {
    printWarn(
      `Dry run: stopping before tagging and pushing ${line.targetBranch}. The remaining steps would tag ${releaseTag}, push it with ${line.targetBranch} atomically, then set ${line.sourceBranch} to ${toDevVersion(nextVersion, line)}.`,
    );
    return undefined;
  }
  if (releaseCommitSha === undefined) {
    throw new Error("git commit-tree produced no commit.");
  }
  printDetail("release commit:", releaseCommitSha);
  _tagAndPush(git, { plan, releaseCommitSha });
  return releaseCommitSha;
}

/** What {@link updateLocalTargetRef} needs to decide whether to move it. */
type UpdateLocalTargetRefOptions = {
  /** The line released, which names the target branch. */
  line: ReleaseLine;
  /** The target branch's new commit, just pushed. */
  releaseCommitSha: string;
  /** Local `<target>` before the release, when it exists. */
  localTargetSha: string | undefined;
  /** `origin/<target>` before the release. */
  originTargetSha: string;
};

/**
 * Fast-forward the local target-branch ref so the next release starts from a
 * sane place.
 *
 * The local ref is a convenience, not a source of truth: the release was built
 * from origin. It is only moved when it is exactly where the release started,
 * and never while another worktree has it checked out, since moving a ref under
 * a worktree makes that worktree report every file as deleted.
 */
export function updateLocalTargetRef(
  git: ReleaseCommands,
  options: Readonly<UpdateLocalTargetRefOptions>,
): void {
  const { line, releaseCommitSha, localTargetSha, originTargetSha } = options;

  const targetWorktree = findWorktreeForBranch(git, line.targetBranch);
  if (targetWorktree !== undefined) {
    printWarn(
      `Local ${line.targetBranch} is checked out at ${targetWorktree}, so it was left alone. Pull it there.`,
    );
    return;
  }
  if (localTargetSha === undefined || localTargetSha === originTargetSha) {
    git.mutate("git", [
      "update-ref",
      `refs/heads/${line.targetBranch}`,
      releaseCommitSha,
    ]);
    return;
  }
  printWarn(
    `Local ${line.targetBranch} has diverged from origin, so it was left alone.`,
  );
}

/**
 * Move the source branch on to the next dev version (`-dev`, or `-alpha-dev`
 * on alpha) and push it.
 */
export function bumpSourceToNextVersion(
  git: ReleaseCommands,
  plan: ReleasePlan,
): void {
  const { line, nextVersion, releaseTag } = plan;
  const devVersion = toDevVersion(nextVersion, line);

  printHeading(`Setting ${line.sourceBranch} to ${devVersion}`);
  try {
    _commitVersion(git, {
      version: devVersion,
      message: `Bump version to ${devVersion} [skip deploy]`,
    });
    const pushResult = _pushSourceBranch(git, line);
    if (!pushResult.ok) {
      throw new Error(pushResult.stderr);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(
      `${releaseTag} is released, but ${line.sourceBranch} could not be bumped to ${devVersion}: ${message}`,
    );
    throw new Error(
      `Set ${line.sourceBranch} to ${devVersion} and push it yourself.`,
    );
  }
}

/** Set the root package.json version and commit it on the current branch. */
function _commitVersion(
  git: ReleaseCommands,
  options: Readonly<{ version: string; message: string }>,
): void {
  const { version, message } = options;

  const versionResult = git.mutate("pnpm", [
    "version",
    version,
    "--no-git-tag-version",
  ]);
  if (!versionResult.ok) {
    throw new Error(
      `Could not set the version to ${version}: ${versionResult.stderr}`,
    );
  }

  const commitResult = git.mutate("git", ["commit", "-am", message]);
  if (!commitResult.ok) {
    throw new Error(
      `Could not commit the version change: ${commitResult.stderr}`,
    );
  }
}

/**
 * Tag the release commit and push it together with the target branch.
 *
 * The push is atomic so the branch and the tag land together or neither does.
 * Without that, a rejected branch update can still publish the tag, which then
 * blocks the retry that would have fixed the problem.
 */
function _tagAndPush(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; releaseCommitSha: string }>,
): void {
  const { plan, releaseCommitSha } = options;
  const { line, releaseTag, releaseVersion, publishedVersion, nextVersion } =
    plan;

  const tagResult = git.mutate("git", [
    "tag",
    "-a",
    releaseTag,
    "-m",
    releaseTag,
    releaseCommitSha,
  ]);
  if (!tagResult.ok) {
    throw new Error(
      `Could not create tag ${releaseTag}: ${tagResult.stderr}
Nothing has been pushed to ${line.targetBranch}.`,
    );
  }

  const pushResult = git.mutate("git", [
    "push",
    "--atomic",
    "origin",
    `${releaseCommitSha}:refs/heads/${line.targetBranch}`,
    `refs/tags/${releaseTag}:refs/tags/${releaseTag}`,
  ]);
  if (!pushResult.ok) {
    git.mutateQuietly("git", ["tag", "-d", releaseTag]);
    throw new Error(
      `Could not push ${line.targetBranch} and ${releaseTag}: ${pushResult.stderr}
${line.sourceBranch} is already at ${publishedVersion} and pushed, and the local tag has been removed. Retry with --version ${releaseVersion} --next ${nextVersion}.`,
    );
  }
  printSuccess(
    `${line.targetBranch} is at ${shortSha(releaseCommitSha)}, tagged ${releaseTag}.`,
  );
}

/** The commit message for the release commit. */
function _buildReleaseCommitMessage(
  options: Readonly<{ plan: ReleasePlan; releaseSha: string }>,
): string {
  const { plan, releaseSha } = options;
  const { line, publishedVersion } = plan;
  return `Release ${publishedVersion}

Sets ${line.targetBranch} to ${line.sourceBranch}'s tree at ${releaseSha} verbatim. Written with git commit-tree, so this is a two-parent merge carrying ${line.sourceBranch}'s exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.`;
}
