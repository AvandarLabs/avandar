import {
  getCurrentBranch,
  getDivergence,
  getTrackedChanges,
  refExists,
  revParse,
} from "@ava-cli/ReleaseCLI/releaseGit";
import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/releaseCommands";

/**
 * Preflight for `ava release`.
 *
 * Every check here refuses; none of them fixes anything. A release should never
 * be the thing that discovers your branch was stale, and it must never quietly
 * repair state on the way to pushing production.
 */

export const RELEASE_SOURCE_BRANCH = "develop";
export const RELEASE_TARGET_BRANCH = "main";

export type PreflightResult =
  | Readonly<{
      ok: true;
      /** Tip of origin/develop: the commit the release is built from. */
      originDevelopSHA: string;
      /** Tip of origin/main: the first parent of the release commit. */
      originMainSHA: string;
      /** Local main, when it exists, so it can be fast-forwarded later. */
      localMainSHA: string | undefined;
    }>
  | Readonly<{ ok: false; message: string }>;

export function runPreflight(git: ReleaseCommands): PreflightResult {
  const currentBranch = getCurrentBranch(git);
  if (currentBranch !== RELEASE_SOURCE_BRANCH) {
    return {
      ok: false,
      message:
        `Releases are cut from "${RELEASE_SOURCE_BRANCH}" (currently on ` +
        `"${currentBranch ?? "a detached HEAD"}").`,
    };
  }

  const trackedChanges = getTrackedChanges(git);
  if (trackedChanges !== undefined) {
    return {
      ok: false,
      message:
        "The working tree has tracked changes, which would be swept into the " +
        `version commit. Commit or stash them first:\n${trackedChanges}`,
    };
  }

  const fetchResult = git.tryGit(["fetch", "--prune", "--tags", "origin"]);
  if (!fetchResult.ok) {
    return {
      ok: false,
      message: `Could not fetch from origin: ${fetchResult.stderr}`,
    };
  }

  const originDevelopSHA = revParse(
    git,
    `refs/remotes/origin/${RELEASE_SOURCE_BRANCH}`,
  );
  if (originDevelopSHA === undefined) {
    return {
      ok: false,
      message: `origin/${RELEASE_SOURCE_BRANCH} does not exist.`,
    };
  }

  const originMainSHA = revParse(
    git,
    `refs/remotes/origin/${RELEASE_TARGET_BRANCH}`,
  );
  if (originMainSHA === undefined) {
    return {
      ok: false,
      message: `origin/${RELEASE_TARGET_BRANCH} does not exist.`,
    };
  }

  const localDevelopSHA = revParse(git, RELEASE_SOURCE_BRANCH);
  if (localDevelopSHA === undefined) {
    return {
      ok: false,
      message: `Could not resolve ${RELEASE_SOURCE_BRANCH}.`,
    };
  }

  // Releasing a commit that only exists locally would ship code that develop's
  // CI never ran, and would leave origin/develop describing a release it does
  // not contain.
  if (localDevelopSHA !== originDevelopSHA) {
    const { ahead, behind } = getDivergence(
      git,
      RELEASE_SOURCE_BRANCH,
      `origin/${RELEASE_SOURCE_BRANCH}`,
    );
    return {
      ok: false,
      message:
        `${RELEASE_SOURCE_BRANCH} is out of sync with origin/` +
        `${RELEASE_SOURCE_BRANCH} (${ahead} ahead, ${behind} behind). ` +
        "Push or pull it, then release.",
    };
  }

  const localMainSHA =
    refExists(git, `refs/heads/${RELEASE_TARGET_BRANCH}`) ?
      revParse(git, RELEASE_TARGET_BRANCH)
    : undefined;

  return { ok: true, originDevelopSHA, originMainSHA, localMainSHA };
}
