import { describeCommandFailure } from "@ava-cli/ReleaseCLI/describeCommandFailure/describeCommandFailure";
import {
  getCurrentBranch,
  getDivergence,
  getGitHubRepoSlug,
  getTrackedChanges,
  refExists,
  revParse,
} from "@ava-cli/ReleaseCLI/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/createReleaseCommands";

/** The branch releases are cut from. */
export const RELEASE_SOURCE_BRANCH = "develop";
/** The branch a release publishes to, and which production deploys from. */
export const RELEASE_TARGET_BRANCH = "main";

/** Why a release was refused, for callers that need more than the message. */
export type PreflightRefusalReason =
  | "wrong-branch"
  | "dirty-tree"
  | "no-push-permission"
  | "unverified-push-permission"
  | "fetch-failed"
  | "missing-ref"
  | "out-of-sync";

/** A refusal: the reason it happened, and what to tell the reviewer. */
export type PreflightRefusal = {
  reason: PreflightRefusalReason;
  message: string;
};

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
  | ({ ok: false } & PreflightRefusal);

/**
 * Whether the repository is in a state a release may be cut from.
 *
 * Every check refuses; none of them fixes anything. A release must never be the
 * thing that discovers a branch was stale, and it must never quietly repair
 * state on the way to pushing production.
 */
export function runPreflight(git: ReleaseCommands): PreflightResult {
  // Cheapest first: two local checks, then the permission call, then the fetch.
  const refusal =
    _refuseWrongBranch(git) ??
    _refuseDirtyTree(git) ??
    _refuseWithoutPushPermission(git) ??
    _refuseFailedFetch(git);
  if (refusal !== undefined) {
    return { ok: false, ...refusal };
  }
  return _resolveReleaseRefs(git);
}

/** The refusal when the checkout is not on the source branch. */
function _refuseWrongBranch(
  git: ReleaseCommands,
): PreflightRefusal | undefined {
  const currentBranch = getCurrentBranch(git);
  return currentBranch === RELEASE_SOURCE_BRANCH ? undefined : (
      {
        reason: "wrong-branch",
        message: `Releases are cut from "${RELEASE_SOURCE_BRANCH}" (currently on "${currentBranch ?? "a detached HEAD"}").`,
      }
    );
}

/**
 * The refusal when tracked changes are present.
 *
 * Untracked files are fine: the release never checks out a branch and never
 * cleans, so they cannot reach it. Tracked modifications and staged changes are
 * a different matter, because the version commits use `git commit -a` and would
 * sweep them in.
 */
function _refuseDirtyTree(git: ReleaseCommands): PreflightRefusal | undefined {
  const trackedChanges = getTrackedChanges(git);
  return trackedChanges === undefined ? undefined : (
      {
        reason: "dirty-tree",
        message: `The working tree has tracked changes, which would be swept into the version commit. Commit or stash them first:\n${trackedChanges}`,
      }
    );
}

/**
 * The refusal when the person running this cannot push to the repository, or
 * `undefined` when they can.
 *
 * A release pushes both branches, deploys production, and migrates the
 * production database, so it refuses here rather than half-way through: without
 * this, the first thing to fail is the `push` after a local version commit has
 * already been made.
 */
function _refuseWithoutPushPermission(
  git: ReleaseCommands,
): PreflightRefusal | undefined {
  // A non-GitHub origin (a local bare remote, say) has nobody to ask.
  const repoSlug = getGitHubRepoSlug(git);
  if (repoSlug === undefined) {
    return undefined;
  }

  const pushPermissionResult = git.readCommand("gh", [
    "api",
    `repos/${repoSlug}`,
    "--jq",
    ".permissions.push",
  ]);
  // An unverified answer is not a yes, for a command with these consequences.
  return (
    !pushPermissionResult.ok ?
      {
        reason: "unverified-push-permission",
        message: `Could not confirm you can push to ${repoSlug}: ${describeCommandFailure(pushPermissionResult, "the gh CLI could not answer")}. Releases push ${RELEASE_SOURCE_BRANCH} and ${RELEASE_TARGET_BRANCH}, so this refuses rather than guess. Run \`gh auth login\` and try again.`,
      }
    : pushPermissionResult.stdout.trim() !== "true" ?
      {
        reason: "no-push-permission",
        message: `You do not have push access to ${repoSlug}, so this release would fail once it tried to push ${RELEASE_SOURCE_BRANCH}. Ask whoever owns the repo to cut the release.`,
      }
    : undefined
  );
}

/** The refusal when origin cannot be fetched. */
function _refuseFailedFetch(
  git: ReleaseCommands,
): PreflightRefusal | undefined {
  const fetchResult = git.tryGit(["fetch", "--prune", "--tags", "origin"]);
  return fetchResult.ok ? undefined : (
      {
        reason: "fetch-failed",
        message: `Could not fetch from origin: ${describeCommandFailure(fetchResult, "git gave no reason")}`,
      }
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
      reason: "missing-ref",
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
      reason: "missing-ref",
      message: `origin/${RELEASE_TARGET_BRANCH} does not exist.`,
    };
  }

  const outOfSync = _refuseOutOfSyncSourceBranch(git, originDevelopSha);
  if (outOfSync !== undefined) {
    return { ok: false, ...outOfSync };
  }

  const localMainSha =
    refExists(git, `refs/heads/${RELEASE_TARGET_BRANCH}`) ?
      revParse(git, RELEASE_TARGET_BRANCH)
    : undefined;
  return { ok: true, originDevelopSha, originMainSha, localMainSha };
}

/**
 * The refusal when the local source branch is not exactly `originSha`.
 *
 * Releasing a commit that only exists locally would ship code the source
 * branch's CI never ran, and would leave origin describing a release it does
 * not contain.
 */
function _refuseOutOfSyncSourceBranch(
  git: ReleaseCommands,
  originSha: string,
): PreflightRefusal | undefined {
  const localDevelopSha = revParse(git, RELEASE_SOURCE_BRANCH);
  if (localDevelopSha === undefined) {
    return {
      reason: "missing-ref",
      message: `Could not resolve ${RELEASE_SOURCE_BRANCH}.`,
    };
  }
  if (localDevelopSha === originSha) {
    return undefined;
  }
  const { ahead, behind } = getDivergence(
    git,
    RELEASE_SOURCE_BRANCH,
    `origin/${RELEASE_SOURCE_BRANCH}`,
  );
  return {
    reason: "out-of-sync",
    message: `${RELEASE_SOURCE_BRANCH} is out of sync with origin/${RELEASE_SOURCE_BRANCH} (${ahead} ahead, ${behind} behind). Push or pull it, then release.`,
  };
}
