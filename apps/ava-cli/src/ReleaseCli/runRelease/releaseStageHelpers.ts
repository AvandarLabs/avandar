import { checkDevelopCI } from "@ava-cli/ReleaseCli/checkDevelopCI";
import { describeCIStatus } from "@ava-cli/ReleaseCli/describeCIStatus";
import {
  createReleaseCommit,
  findWorktreeForBranch,
  getGitHubRepoSlug,
  localTagExists,
  readTreeSha,
  remoteTagExists,
  revParse,
  shortSha,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
} from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import {
  printDetail,
  printDetails,
  printHeading,
} from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/**
 * The individual stages of a release, in the order `runRelease` calls them.
 *
 * Each stage is self-contained and throws with a message that says exactly what
 * has and has not happened, so a failure half-way through is recoverable.
 */

/** The versions and tag a release is being cut with. */
export type ReleasePlan = {
  developVersion: string;
  releaseVersion: string;
  nextVersion: string;
  releaseTag: string;
};

/** Refuse a tag that already exists locally or on origin. */
export function assertTagIsUnused(
  git: ReleaseCommands,
  plan: ReleasePlan,
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
 * Report the staging CI verdict for the commit being released, and ask before
 * proceeding on anything other than a pass.
 */
export async function confirmCIVerdict(
  git: ReleaseCommands,
  options: Readonly<{ commitSha: string; assumeYes: boolean; skip: boolean }>,
): Promise<void> {
  const { commitSha, assumeYes, skip } = options;

  if (skip) {
    printWarn("Skipping the staging CI check.");
    return;
  }
  printHeading("CI");
  const ciStatus = checkDevelopCI(git, {
    commitSha,
    branch: RELEASE_SOURCE_BRANCH,
  });
  const verdict = `${describeCIStatus(ciStatus)} (${shortSha(commitSha)})`;

  if (ciStatus.kind === "passed") {
    printSuccess(verdict);
    return;
  }
  printWarn(verdict);
  if (!assumeYes && !(await promptToConfirm("Release anyway?"))) {
    throw new Error("Aborted.");
  }
}

/** Print what the release will do, then take the last chance to stop. */
export async function confirmReleasePlan(
  git: ReleaseCommands,
  options: Readonly<{
    plan: ReleasePlan;
    originDevelopSha: string;
    originMainSha: string;
    assumeYes: boolean;
  }>,
): Promise<void> {
  const { plan, originDevelopSha, originMainSha, assumeYes } = options;
  const { developVersion, releaseVersion, nextVersion, releaseTag } = plan;

  printHeading("Plan");
  printDetails([
    [
      `1. ${RELEASE_SOURCE_BRANCH}:`,
      `${developVersion} to ${releaseVersion}, pushed`,
    ],
    [
      `2. ${RELEASE_TARGET_BRANCH}:`,
      `set to ${RELEASE_SOURCE_BRANCH}@${shortSha(originDevelopSha)}'s tree, tagged ${releaseTag}`,
    ],
    [
      `3. ${RELEASE_SOURCE_BRANCH}:`,
      `${releaseVersion} to ${toDevVersion(nextVersion)}, pushed`,
    ],
  ]);

  if (readTreeSha(git, originDevelopSha) === readTreeSha(git, originMainSha)) {
    printWarn(
      `${RELEASE_SOURCE_BRANCH} and ${RELEASE_TARGET_BRANCH} already have identical content: this release ships no changes.`,
    );
  }
  printWarn(
    `Pushing ${RELEASE_TARGET_BRANCH} deploys production and migrates the production database.`,
  );

  if (
    !git.dryRun &&
    !assumeYes &&
    !(await promptToConfirm(`Release ${releaseVersion}?`))
  ) {
    throw new Error("Aborted.");
  }
}

/**
 * Put the release version on the source branch and push it, so the released
 * tree is one that exists on that branch under its real version number.
 *
 * Returns the commit the release publishes.
 */
export function commitReleaseVersionOnDevelop(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; originDevelopSha: string }>,
): string {
  const { plan, originDevelopSha } = options;
  const { developVersion, releaseVersion } = plan;

  printHeading(`Setting ${RELEASE_SOURCE_BRANCH} to ${releaseVersion}`);
  if (developVersion === releaseVersion) {
    printSuccess(
      `package.json is already ${releaseVersion}; nothing to commit.`,
    );
  } else {
    _commitVersion(git, {
      version: releaseVersion,
      message: `Release: v${releaseVersion} [skip deploy]`,
    });
    const pushResult = git.mutate("git", [
      "push",
      "origin",
      RELEASE_SOURCE_BRANCH,
    ]);
    if (!pushResult.ok) {
      throw new Error(
        `Could not push ${RELEASE_SOURCE_BRANCH}: ${pushResult.stderr}
Nothing has been released. Fix the push and run the command again.`,
      );
    }
  }
  // On a dry run no commit was made, so the release commit is the branch tip.
  return git.dryRun
    ? originDevelopSha
    : (revParse(git, "HEAD") ?? originDevelopSha);
}

/**
 * Build the release commit from the source branch's tree, tag it, and push the
 * branch and tag atomically.
 *
 * Returns the new commit, or `undefined` on a dry run, where there is nothing
 * to tag or push.
 */
export function publishMainAndTag(
  git: ReleaseCommands,
  options: Readonly<{
    plan: ReleasePlan;
    releaseSha: string;
    originMainSha: string;
  }>,
): string | undefined {
  const { plan, releaseSha, originMainSha } = options;
  const { releaseTag, releaseVersion, nextVersion } = plan;

  printHeading(
    `Building ${RELEASE_TARGET_BRANCH} from ${RELEASE_SOURCE_BRANCH}`,
  );
  const releaseTreeSha = readTreeSha(git, releaseSha);
  if (releaseTreeSha === undefined) {
    throw new Error(`Could not read the tree of ${shortSha(releaseSha)}.`);
  }
  const releaseCommitSha = createReleaseCommit(git, {
    releaseTreeSha,
    mainParentSha: originMainSha,
    developParentSha: releaseSha,
    message: _releaseCommitMessage(releaseVersion, releaseSha),
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

/**
 * Fast-forward the local target-branch ref so the next release starts from a
 * sane place.
 *
 * The local ref is a convenience, not a source of truth: the release was built
 * from origin. It is only moved when it is exactly where the release started,
 * and never while another worktree has it checked out, since moving a ref under
 * a worktree makes that worktree report every file as deleted.
 */
export function updateLocalMainRef(
  git: ReleaseCommands,
  options: Readonly<{
    releaseCommitSha: string;
    localMainSha: string | undefined;
    originMainSha: string;
  }>,
): void {
  const { releaseCommitSha, localMainSha, originMainSha } = options;

  const mainWorktree = findWorktreeForBranch(git, RELEASE_TARGET_BRANCH);
  if (mainWorktree !== undefined) {
    printWarn(
      `Local ${RELEASE_TARGET_BRANCH} is checked out at ${mainWorktree}, so it was left alone. Pull it there.`,
    );
    return;
  }
  if (localMainSha === undefined || localMainSha === originMainSha) {
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

/** Move the source branch on to the next `-dev` version and push it. */
export function bumpDevelopToNextVersion(
  git: ReleaseCommands,
  plan: ReleasePlan,
): void {
  const { nextVersion, releaseTag } = plan;
  const devVersion = toDevVersion(nextVersion);

  printHeading(`Setting ${RELEASE_SOURCE_BRANCH} to ${devVersion}`);
  try {
    _commitVersion(git, {
      version: devVersion,
      message: `Bump version to ${devVersion} [skip deploy]`,
    });
    const pushResult = git.mutate("git", [
      "push",
      "origin",
      RELEASE_SOURCE_BRANCH,
    ]);
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

/** Report what was released, with links to the run and the tag. */
export function printReleaseSummary(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; releaseSha: string }>,
): void {
  const { plan, releaseSha } = options;
  const { releaseVersion, nextVersion, releaseTag } = plan;

  printHeading(`Released ${releaseVersion}`);
  printSuccess(
    `${RELEASE_TARGET_BRANCH} = ${RELEASE_SOURCE_BRANCH}@${shortSha(releaseSha)}, tagged ${releaseTag}`,
  );
  printSuccess(`${RELEASE_SOURCE_BRANCH} = ${toDevVersion(nextVersion)}`);

  const repoSlug = getGitHubRepoSlug(git);
  if (repoSlug === undefined) {
    return;
  }
  printInfo(
    `Production run: https://github.com/${repoSlug}/actions/workflows/production.yaml`,
  );
  printInfo(
    `Tag:            https://github.com/${repoSlug}/releases/tag/${releaseTag}`,
  );
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
    `refs/tags/${releaseTag}`,
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
function _releaseCommitMessage(
  releaseVersion: string,
  releaseSha: string,
): string {
  return `Release ${releaseVersion}

Sets ${RELEASE_TARGET_BRANCH} to ${RELEASE_SOURCE_BRANCH}'s tree at ${releaseSha} verbatim. Written with git commit-tree, so this is a two-parent merge carrying develop's exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.`;
}
