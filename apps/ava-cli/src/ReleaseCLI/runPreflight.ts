import {
  getCurrentBranch,
  getDivergence,
  getTrackedChanges,
  refExists,
  revParse,
} from "@ava-cli/ReleaseCLI/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/createReleaseCommands";

/** The branch releases are cut from. */
export const RELEASE_SOURCE_BRANCH = "develop";
/** The branch a release publishes to, and which production deploys from. */
export const RELEASE_TARGET_BRANCH = "main";

/** Whether a release may proceed, and the refs it will be built from. */
export type PreflightResult =
  | {
      ok: true;
      /** Tip of origin/develop: the commit the release is built from. */
      originDevelopSha: string;
      /** Tip of origin/main: the first parent of the release commit. */
      originMainSha: string;
      /** Local main, when it exists, so it can be fast-forwarded later. */
      localMainSha: string | undefined;
    }
  | { ok: false; message: string };

/**
 * Whether the repository is in a state a release may be cut from.
 *
 * Every check refuses; none of them fixes anything. A release must never be the
 * thing that discovers a branch was stale, and it must never quietly repair
 * state on the way to pushing production.
 */
export function runPreflight(git: ReleaseCommands): PreflightResult {
  const refusal =
    _refuseWrongBranch(git) ?? _refuseDirtyTree(git) ?? _refuseFailedFetch(git);
  if (refusal !== undefined) {
    return { ok: false, message: refusal };
  }
  return _resolveReleaseRefs(git);
}

/** The refusal message when the checkout is not on the source branch. */
function _refuseWrongBranch(git: ReleaseCommands): string | undefined {
  const currentBranch = getCurrentBranch(git);
  return currentBranch === RELEASE_SOURCE_BRANCH ? undefined : (
      `Releases are cut from "${RELEASE_SOURCE_BRANCH}" (currently on "${currentBranch ?? "a detached HEAD"}").`
    );
}

/**
 * The refusal message when tracked changes are present.
 *
 * Untracked files are fine: the release never checks out a branch and never
 * cleans, so they cannot reach it. Tracked modifications and staged changes are
 * a different matter, because the version commits use `git commit -a` and would
 * sweep them in.
 */
function _refuseDirtyTree(git: ReleaseCommands): string | undefined {
  const trackedChanges = getTrackedChanges(git);
  return trackedChanges === undefined ? undefined : (
      `The working tree has tracked changes, which would be swept into the version commit. Commit or stash them first:\n${trackedChanges}`
    );
}

/** The refusal message when origin cannot be fetched. */
function _refuseFailedFetch(git: ReleaseCommands): string | undefined {
  const fetchResult = git.tryGit(["fetch", "--prune", "--tags", "origin"]);
  return fetchResult.ok ? undefined : (
      `Could not fetch from origin: ${fetchResult.stderr}`
    );
}

/**
 * The refs the release will be built from, or a refusal when one is missing or
 * the source branch is out of sync with origin.
 */
function _resolveReleaseRefs(git: ReleaseCommands): PreflightResult {
  const originDevelopSha = revParse(
    git,
    `refs/remotes/origin/${RELEASE_SOURCE_BRANCH}`,
  );
  if (originDevelopSha === undefined) {
    return {
      ok: false,
      message: `origin/${RELEASE_SOURCE_BRANCH} does not exist.`,
    };
  }

  const originMainSha = revParse(
    git,
    `refs/remotes/origin/${RELEASE_TARGET_BRANCH}`,
  );
  if (originMainSha === undefined) {
    return {
      ok: false,
      message: `origin/${RELEASE_TARGET_BRANCH} does not exist.`,
    };
  }

  const outOfSync = _refuseOutOfSyncSourceBranch(git, originDevelopSha);
  if (outOfSync !== undefined) {
    return { ok: false, message: outOfSync };
  }

  const localMainSha =
    refExists(git, `refs/heads/${RELEASE_TARGET_BRANCH}`) ?
      revParse(git, RELEASE_TARGET_BRANCH)
    : undefined;
  return { ok: true, originDevelopSha, originMainSha, localMainSha };
}

/**
 * The refusal message when the local source branch is not exactly `originSha`.
 *
 * Releasing a commit that only exists locally would ship code the source
 * branch's CI never ran, and would leave origin describing a release it does
 * not contain.
 */
function _refuseOutOfSyncSourceBranch(
  git: ReleaseCommands,
  originSha: string,
): string | undefined {
  const localDevelopSha = revParse(git, RELEASE_SOURCE_BRANCH);
  if (localDevelopSha === undefined) {
    return `Could not resolve ${RELEASE_SOURCE_BRANCH}.`;
  }
  if (localDevelopSha === originSha) {
    return undefined;
  }
  const { ahead, behind } = getDivergence(
    git,
    RELEASE_SOURCE_BRANCH,
    `origin/${RELEASE_SOURCE_BRANCH}`,
  );
  return `${RELEASE_SOURCE_BRANCH} is out of sync with origin/${RELEASE_SOURCE_BRANCH} (${ahead} ahead, ${behind} behind). Push or pull it, then release.`;
}
