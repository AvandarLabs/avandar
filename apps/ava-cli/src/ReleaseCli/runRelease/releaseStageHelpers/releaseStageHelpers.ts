import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
} from "@ava-cli/ReleaseCli/releaseBranches/releaseBranches";
import {
  createReleaseCommit,
  findWorktreeForBranch,
  getCurrentBranch,
  getTrackedChanges,
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
 * The versions and tag a release is being cut with, built once by
 * `runRelease` and read by every stage.
 */
export type ReleasePlan = {
  /** The version on the source branch before the release, e.g. `0.10.2-dev`. */
  sourceVersion: string;
  /** The `X.Y.Z` being released and written to package.json, e.g. `0.10.2`. */
  releaseVersion: string;
  /** The bare `X.Y.Z` the source branch moves to, without the dev suffix. */
  nextVersion: string;
  /** The git tag, e.g. `v0.10.2`. */
  releaseTag: string;
};

/**
 * Push the checked-out source branch to origin by its full ref, so a tag named
 * like the branch cannot make the destination ambiguous. Preflight has already
 * refused any other checked-out branch.
 */
function _pushSourceBranch(git: ReleaseCommands): CommandResult {
  return git.mutate("git", [
    "push",
    "origin",
    `HEAD:refs/heads/${RELEASE_SOURCE_BRANCH}`,
  ]);
}

/** Refuse a tag that already exists locally or on origin. */
export function assertTagIsUnused(
  git: ReleaseCommands,
  plan: Readonly<ReleasePlan>,
): void {
  const { releaseTag, releaseVersion } = plan;

  if (localTagExists(git, releaseTag)) {
    throw new Error(
      `Tag ${releaseTag} already exists locally. Pick another version, or delete the tag.`,
    );
  }
  if (remoteTagExists(git, releaseTag)) {
    throw new Error(
      `Tag ${releaseTag} already exists on origin, so ${releaseVersion} has been released.`,
    );
  }
}

/**
 * Why the checkout cannot take the release version commit, or undefined when
 * it can: it must be on the source branch, at the commit preflight resolved,
 * with no tracked changes. Preflight checked all three, but prompts run
 * between preflight and this commit, and the commit is pushed straight to the
 * source branch.
 */
function _getUnreleasableCheckoutReason(
  git: ReleaseCommands,
  originSourceSha: string,
): string | undefined {
  const currentBranch = getCurrentBranch(git);
  if (currentBranch !== RELEASE_SOURCE_BRANCH) {
    return `the checkout is on ${currentBranch ?? "a detached HEAD"}, not ${RELEASE_SOURCE_BRANCH}`;
  }
  if (revParse(git, "HEAD") !== originSourceSha) {
    return `HEAD is no longer at origin/${RELEASE_SOURCE_BRANCH} (${shortSha(originSourceSha)}), where preflight found it`;
  }
  return getTrackedChanges(git) === undefined
    ? undefined
    : "the working tree has tracked changes";
}

/**
 * Put the release version (`0.10.2`) on the source branch and push it, so the
 * released tree is one that exists on that branch under its real version
 * number.
 *
 * Returns the commit the release publishes.
 */
export function commitReleaseVersionOnSource(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; originSourceSha: string }>,
): string {
  const { plan, originSourceSha } = options;
  const { sourceVersion, releaseVersion, releaseTag } = plan;

  const unreleasableReason = _getUnreleasableCheckoutReason(
    git,
    originSourceSha,
  );
  if (unreleasableReason !== undefined) {
    throw new Error(
      `Cannot commit ${releaseVersion} on ${RELEASE_SOURCE_BRANCH}: ${unreleasableReason}. Nothing has been released.`,
    );
  }
  printHeading(`Setting ${RELEASE_SOURCE_BRANCH} to ${releaseVersion}`);
  if (sourceVersion === releaseVersion) {
    printSuccess(
      `package.json is already ${releaseVersion}; nothing to commit.`,
    );
  } else {
    _commitVersion(git, {
      version: releaseVersion,
      message: `Release: ${releaseTag} [skip deploy]`,
    });
    const pushResult = _pushSourceBranch(git);
    if (!pushResult.ok) {
      throw new Error(
        `Could not push ${RELEASE_SOURCE_BRANCH}: ${pushResult.stderr}
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
  const { releaseTag, nextVersion } = plan;

  printHeading(
    `Building ${RELEASE_TARGET_BRANCH} from ${RELEASE_SOURCE_BRANCH}`,
  );
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
      `Dry run: stopping before tagging and pushing ${RELEASE_TARGET_BRANCH}. The remaining steps would tag ${releaseTag}, push it with ${RELEASE_TARGET_BRANCH} atomically, then set ${RELEASE_SOURCE_BRANCH} to ${toDevVersion(nextVersion)}.`,
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
  const { releaseCommitSha, localTargetSha, originTargetSha } = options;

  const targetWorktree = findWorktreeForBranch(git, RELEASE_TARGET_BRANCH);
  if (targetWorktree !== undefined) {
    printWarn(
      `Local ${RELEASE_TARGET_BRANCH} is checked out at ${targetWorktree}, so it was left alone. Pull it there.`,
    );
    return;
  }
  if (localTargetSha === undefined || localTargetSha === originTargetSha) {
    git.mutate("git", [
      "update-ref",
      `refs/heads/${RELEASE_TARGET_BRANCH}`,
      releaseCommitSha,
    ]);
    return;
  }
  printWarn(
    `Local ${RELEASE_TARGET_BRANCH} has diverged from origin, so it was left alone.`,
  );
}

/** Move the source branch on to the next dev version (`-dev`) and push it. */
export function bumpSourceToNextVersion(
  git: ReleaseCommands,
  plan: Readonly<ReleasePlan>,
): void {
  const { nextVersion, releaseTag } = plan;
  const devVersion = toDevVersion(nextVersion);

  printHeading(`Setting ${RELEASE_SOURCE_BRANCH} to ${devVersion}`);
  try {
    _commitVersion(git, {
      version: devVersion,
      message: `Bump version to ${devVersion} [skip deploy]`,
    });
    const pushResult = _pushSourceBranch(git);
    if (!pushResult.ok) {
      throw new Error(pushResult.stderr);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(
      `${releaseTag} is released, but ${RELEASE_SOURCE_BRANCH} could not be bumped to ${devVersion}: ${message}`,
    );
    throw new Error(
      `Set ${RELEASE_SOURCE_BRANCH} to ${devVersion} and push it yourself.`,
    );
  }
}

/**
 * Set the root package.json version and commit only that file on the current
 * branch, so nothing else in the working tree can reach the version commit.
 */
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

  const commitResult = git.mutate("git", [
    "commit",
    "-m",
    message,
    "--",
    "package.json",
  ]);
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
  const { releaseTag, releaseVersion, nextVersion } = plan;

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
Nothing has been pushed to ${RELEASE_TARGET_BRANCH}.`,
    );
  }

  const pushResult = git.mutate("git", [
    "push",
    "--atomic",
    "origin",
    `${releaseCommitSha}:refs/heads/${RELEASE_TARGET_BRANCH}`,
    `refs/tags/${releaseTag}:refs/tags/${releaseTag}`,
  ]);
  if (!pushResult.ok) {
    git.mutateQuietly("git", ["tag", "-d", releaseTag]);
    throw new Error(
      `Could not push ${RELEASE_TARGET_BRANCH} and ${releaseTag}: ${pushResult.stderr}
${RELEASE_SOURCE_BRANCH} is already at ${releaseVersion} and pushed, and the local tag has been removed. Retry with --version ${releaseVersion} --next ${nextVersion}.`,
    );
  }
  printSuccess(
    `${RELEASE_TARGET_BRANCH} is at ${shortSha(releaseCommitSha)}, tagged ${releaseTag}.`,
  );
}

/** The commit message for the release commit. */
function _buildReleaseCommitMessage(
  options: Readonly<{ plan: ReleasePlan; releaseSha: string }>,
): string {
  const { plan, releaseSha } = options;
  const { releaseVersion } = plan;
  return `Release ${releaseVersion}

Sets ${RELEASE_TARGET_BRANCH} to ${RELEASE_SOURCE_BRANCH}'s tree at ${releaseSha} verbatim. Written with git commit-tree, so this is a two-parent merge carrying ${RELEASE_SOURCE_BRANCH}'s exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.`;
}
