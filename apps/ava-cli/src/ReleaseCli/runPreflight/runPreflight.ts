import { describeCommandFailure } from "@ava-cli/ReleaseCli/describeCommandFailure/describeCommandFailure";
import {
  ALPHA_RELEASE_LINE,
  getReleaseLineFromBranch,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import {
  getCurrentBranch,
  getDivergence,
  getGitHubRepoSlug,
  getTrackedChanges,
  refExists,
  revParse,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

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
      /** The line being released, from the checked-out branch. */
      line: ReleaseLine;
      /** Tip of origin/<source>: the commit the release is built from. */
      originSourceSha: string;
      /** Tip of origin/<target>: the first parent of the release commit. */
      originTargetSha: string;
      /** Local <target>, when it exists, so it can be fast-forwarded later. */
      localTargetSha: string | undefined;
    }
  | ({ ok: false } & PreflightRefusal);

/**
 * The line released from the checked-out branch, or the refusal when releases
 * may not be cut from it. Only a source branch qualifies: a target branch
 * (`main`, `alpha`), a feature branch, and a detached HEAD are all refused.
 */
function _resolveLine(
  git: ReleaseCommands,
): { ok: true; line: ReleaseLine } | ({ ok: false } & PreflightRefusal) {
  const currentBranch = getCurrentBranch(git);
  const line = getReleaseLineFromBranch(currentBranch);
  const alphaSource = ALPHA_RELEASE_LINE.sourceBranch;
  const mainlineSource = MAINLINE_RELEASE_LINE.sourceBranch;
  return line !== undefined
    ? { ok: true, line }
    : {
        ok: false,
        reason: "wrong-branch",
        message: `Releases are cut from "${alphaSource}" or "${mainlineSource}" (currently on "${currentBranch ?? "a detached HEAD"}"). Run it on ${alphaSource} to release alpha, or on ${mainlineSource} to release mainline.`,
      };
}

/**
 * The refusal when tracked changes are present.
 *
 * Untracked files are fine: the release never checks out a branch and never
 * cleans, so they cannot reach it. Tracked modifications and staged changes are
 * a different matter: a change to package.json would be committed with the new
 * version, and any other one means the checkout is not the commit being
 * released.
 */
function _refuseDirtyTree(git: ReleaseCommands): PreflightRefusal | undefined {
  const trackedChanges = getTrackedChanges(git);
  return trackedChanges === undefined
    ? undefined
    : {
        reason: "dirty-tree",
        message: `The working tree has tracked changes, which would be swept into the version commit. Commit or stash them first:\n${trackedChanges}`,
      };
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
  line: ReleaseLine,
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
  return !pushPermissionResult.ok
    ? {
        reason: "unverified-push-permission",
        message: `Could not confirm you can push to ${repoSlug}: ${describeCommandFailure(pushPermissionResult, "the gh CLI could not answer")}. Releases push ${line.sourceBranch} and ${line.targetBranch}, so this refuses rather than guess. Run \`gh auth login\` and try again.`,
      }
    : pushPermissionResult.stdout.trim() !== "true"
      ? {
          reason: "no-push-permission",
          message: `You do not have push access to ${repoSlug}, so this release would fail once it tried to push ${line.sourceBranch}. Ask whoever owns the repo to cut the release.`,
        }
      : undefined;
}

/** The refusal when origin cannot be fetched. */
function _refuseFailedFetch(
  git: ReleaseCommands,
): PreflightRefusal | undefined {
  const fetchResult = git.tryGit(["fetch", "--prune", "--tags", "origin"]);
  return fetchResult.ok
    ? undefined
    : {
        reason: "fetch-failed",
        message: `Could not fetch from origin: ${describeCommandFailure(fetchResult, "git gave no reason")}`,
      };
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
  options: Readonly<{ line: ReleaseLine; originSha: string }>,
): PreflightRefusal | undefined {
  const { line, originSha } = options;
  // Fully qualified: the fetch brings in tags, and a tag named like the source
  // branch would otherwise shadow it and hide unpushed commits.
  const localSourceRef = `refs/heads/${line.sourceBranch}`;
  const localSourceSha = revParse(git, localSourceRef);
  if (localSourceSha === undefined) {
    return {
      reason: "missing-ref",
      message: `Could not resolve ${line.sourceBranch}.`,
    };
  }
  if (localSourceSha === originSha) {
    return undefined;
  }
  const { ahead, behind } = getDivergence(
    git,
    localSourceRef,
    `refs/remotes/origin/${line.sourceBranch}`,
  );
  return {
    reason: "out-of-sync",
    message: `${line.sourceBranch} is out of sync with origin/${line.sourceBranch} (${ahead} ahead, ${behind} behind). Push or pull it, then release.`,
  };
}

/**
 * The refusal message when `origin/<target>` is missing, for
 * `_resolveReleaseRefs`. On the alpha line this is expected before the first
 * release, so the message carries the command that creates `alpha` at
 * `main`'s commit.
 */
function _buildMissingTargetMessage(line: ReleaseLine): string {
  const missing = `origin/${line.targetBranch} does not exist.`;
  return line.kind === "alpha"
    ? `${missing} For the first alpha release, create it at ${MAINLINE_RELEASE_LINE.targetBranch}'s commit first: git push origin refs/remotes/origin/${MAINLINE_RELEASE_LINE.targetBranch}:refs/heads/${line.targetBranch}`
    : missing;
}

/**
 * The refs the release will be built from, or a refusal when one is missing or
 * the source branch is out of sync with origin.
 */
function _resolveReleaseRefs(
  git: ReleaseCommands,
  line: ReleaseLine,
): PreflightResult {
  const originSourceSha = revParse(
    git,
    `refs/remotes/origin/${line.sourceBranch}`,
  );
  if (originSourceSha === undefined) {
    return {
      ok: false,
      reason: "missing-ref",
      message: `origin/${line.sourceBranch} does not exist.`,
    };
  }

  const originTargetSha = revParse(
    git,
    `refs/remotes/origin/${line.targetBranch}`,
  );
  if (originTargetSha === undefined) {
    return {
      ok: false,
      reason: "missing-ref",
      message: _buildMissingTargetMessage(line),
    };
  }

  const outOfSync = _refuseOutOfSyncSourceBranch(git, {
    line,
    originSha: originSourceSha,
  });
  if (outOfSync !== undefined) {
    return { ok: false, ...outOfSync };
  }

  // Fully qualified, so a tag named `main` or `alpha` cannot win the lookup.
  const localTargetRef = `refs/heads/${line.targetBranch}`;
  const localTargetSha = refExists(git, localTargetRef)
    ? revParse(git, localTargetRef)
    : undefined;
  return { ok: true, line, originSourceSha, originTargetSha, localTargetSha };
}

/**
 * Whether the repository is in a state a release may be cut from, and which
 * line it releases. `runRelease` calls it before anything else, so a release
 * on `alpha-dev` cuts alpha, one on `develop` cuts mainline, and any other
 * branch is refused before a single network call.
 *
 * Every check refuses; none of them fixes anything. A release must never be the
 * thing that discovers a branch was stale, and it must never quietly repair
 * state on the way to pushing production.
 */
export function runPreflight(git: ReleaseCommands): PreflightResult {
  // The branch decides everything else, so nothing runs on a refused one.
  const resolvedLine = _resolveLine(git);
  if (!resolvedLine.ok) {
    return resolvedLine;
  }
  const { line } = resolvedLine;

  // Cheapest first: a local check, then the permission call, then the fetch.
  const refusal =
    _refuseDirtyTree(git) ??
    _refuseWithoutPushPermission(git, line) ??
    _refuseFailedFetch(git);
  if (refusal !== undefined) {
    return { ok: false, ...refusal };
  }
  return _resolveReleaseRefs(git, line);
}
