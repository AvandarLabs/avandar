import {
  checkDevelopCI,
  describeCIStatus,
} from "@ava-cli/ReleaseCLI/checkDevelopCI";
import { createReleaseCommands } from "@ava-cli/ReleaseCLI/releaseCommands";
import {
  createReleaseCommit,
  findWorktreeForBranch,
  localTagExists,
  readTreeSHA,
  readVersionAtRevision,
  remoteTagExists,
  revParse,
  shortSHA,
} from "@ava-cli/ReleaseCLI/releaseGit";
import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
  runPreflight,
} from "@ava-cli/ReleaseCLI/releasePreflight";
import {
  promptForVersion,
  promptToConfirm,
} from "@ava-cli/ReleaseCLI/releasePrompts";
import {
  suggestNextVersion,
  toDevVersion,
  toReleaseTag,
  toReleaseVersion,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCLI/releaseVersions";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/releaseCommands";

/**
 * Releases the Avandar app: `main` becomes an exact copy of `develop`, tagged,
 * and `develop` moves on to the next `-dev` version.
 *
 * The release is a straight cut, not a merge. `main` is only ever a published
 * snapshot of `develop`, so there is nothing to reconcile and no conflict is
 * possible; see `createReleaseCommit` for how that is achieved and why the
 * previous squash-based flow conflicted on every release instead.
 *
 * The four steps are ordered so that each one is independently recoverable, and
 * so that nothing irreversible happens before the last possible confirmation:
 *
 *   1. Preflight, versions, and CI verdict. Nothing has changed yet.
 *   2. `develop` gets the release version, committed and pushed. This is the
 *      commit that gets released, so the released tree is one that exists on
 *      develop under its real version number.
 *   3. `main` and the tag are built and pushed atomically. This deploys
 *      production and migrates the production database.
 *   4. `develop` moves to the next `-dev` version.
 */

export type ReleaseOptions = Readonly<{
  /** Version to release. Prompted for when omitted. */
  version: string | undefined;
  /** Version develop moves to (gains `-dev`). Prompted for when omitted. */
  next: string | undefined;
  /** Accept every default and skip confirmations. */
  yes: boolean;
  /** Print every mutating command without running it. */
  dryRun: boolean;
  /** Skip the staging CI check for develop. */
  skipCICheck: boolean;
}>;

function printHeading(heading: string): void {
  Acclimate.log("\n|bright_white|$heading$|reset|", { heading });
}

function printDetail(label: string, value: string): void {
  Acclimate.log("  |gray|$label$|reset| $value$", { label, value });
}

/**
 * Prints label/value pairs with the labels padded to a common width, so the
 * values line up regardless of how long the branch names are.
 */
function printDetails(details: ReadonlyArray<readonly [string, string]>): void {
  const width = Math.max(
    ...details.map(([label]) => {
      return label.length;
    }),
  );
  for (const [label, value] of details) {
    printDetail(label.padEnd(width, " "), value);
  }
}

/**
 * Prints the versions the user needs in order to answer the prompts.
 *
 * Only the lines relevant to an unanswered question are printed: an option that
 * was already passed on the command line raises no prompt, so its reference
 * values would be noise.
 */
function printVersionReference(options: {
  mainVersion: string | undefined;
  developVersion: string;
  suggestedRelease: string;
  suggestedNext: string | undefined;
  needsReleaseVersion: boolean;
  needsNextVersion: boolean;
}): void {
  const {
    mainVersion,
    developVersion,
    suggestedRelease,
    suggestedNext,
    needsReleaseVersion,
    needsNextVersion,
  } = options;

  if (!needsReleaseVersion && !needsNextVersion) {
    return;
  }

  printHeading("Versions");
  const details: Array<readonly [string, string]> = [];
  if (needsReleaseVersion) {
    details.push(
      [`current on ${RELEASE_TARGET_BRANCH}:`, mainVersion ?? "unknown"],
      [`current on ${RELEASE_SOURCE_BRANCH}:`, developVersion],
      ["suggested release:", suggestedRelease],
    );
  }
  if (needsNextVersion && suggestedNext !== undefined) {
    details.push([
      "suggested next:",
      `${suggestedNext} (patch bump, becomes ${toDevVersion(suggestedNext)})`,
    ]);
  }
  printDetails(details);
}

/** Resolves the release version from the option or the user. */
async function resolveReleaseVersion(options: {
  provided: string | undefined;
  suggested: string;
  assumeYes: boolean;
}): Promise<string> {
  const { provided, suggested, assumeYes } = options;

  if (provided !== undefined) {
    const validation = validateReleaseVersion(provided, "The release version");
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return provided.trim();
  }
  if (assumeYes) {
    return suggested;
  }
  return promptForVersion({
    message: "Which version are you releasing?",
    defaultValue: suggested,
    label: "The release version",
  });
}

/** Resolves the next `-dev` version from the option or the user. */
async function resolveNextVersion(options: {
  provided: string | undefined;
  releaseVersion: string;
  assumeYes: boolean;
}): Promise<string> {
  const { provided, releaseVersion, assumeYes } = options;

  if (provided !== undefined) {
    const validation = validateReleaseVersion(provided, "The next version");
    if (!validation.valid) {
      throw new Error(validation.message);
    }
    return provided.trim();
  }

  const suggested = suggestNextVersion(releaseVersion);
  if (assumeYes) {
    if (suggested === undefined) {
      throw new Error(
        `Could not suggest a version after ${releaseVersion}. Pass --next.`,
      );
    }
    return suggested;
  }
  return promptForVersion({
    message: `Which version should ${RELEASE_SOURCE_BRANCH} move to next?`,
    defaultValue: suggested,
    label: "The next version",
  });
}

/** Sets the root package.json version and commits it on the current branch. */
function commitVersion(
  git: ReleaseCommands,
  options: { version: string; message: string },
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

export async function runRelease(options: ReleaseOptions): Promise<void> {
  const { version, next, yes, dryRun, skipCICheck } = options;

  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this from inside the repository.",
    );
  }

  const git = createReleaseCommands({ repoRoot, dryRun });
  if (dryRun) {
    printWarn("Dry run: no local or remote state will change.");
  }

  // ---------------------------------------------------------------------------
  // 1. Preflight
  // ---------------------------------------------------------------------------
  printHeading("Preflight");
  const preflight = runPreflight(git);
  if (!preflight.ok) {
    throw new Error(preflight.message);
  }
  const { originDevelopSHA, originMainSHA, localMainSHA } = preflight;
  printSuccess(
    `On ${RELEASE_SOURCE_BRANCH}, clean, in sync with origin/${RELEASE_SOURCE_BRANCH}.`,
  );

  // ---------------------------------------------------------------------------
  // 2. Versions
  // ---------------------------------------------------------------------------
  const developVersion = readVersionAtRevision(git, originDevelopSHA);
  if (developVersion === undefined) {
    throw new Error(
      `Could not read the version from package.json on ${RELEASE_SOURCE_BRANCH}.`,
    );
  }
  const mainVersion = readVersionAtRevision(git, originMainSHA);
  const suggestedRelease = toReleaseVersion(developVersion);

  printVersionReference({
    mainVersion,
    developVersion,
    suggestedRelease,
    suggestedNext: suggestNextVersion(version ?? suggestedRelease),
    needsReleaseVersion: version === undefined,
    needsNextVersion: next === undefined,
  });

  const releaseVersion = await resolveReleaseVersion({
    provided: version,
    suggested: suggestedRelease,
    assumeYes: yes,
  });
  const nextVersion = await resolveNextVersion({
    provided: next,
    releaseVersion,
    assumeYes: yes,
  });
  const releaseTag = toReleaseTag(releaseVersion);

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

  // ---------------------------------------------------------------------------
  // 3. CI verdict for the commit being released
  // ---------------------------------------------------------------------------
  if (skipCICheck) {
    printWarn("Skipping the staging CI check.");
  } else {
    printHeading("CI");
    const ciStatus = checkDevelopCI(git, {
      commitSHA: originDevelopSHA,
      branch: RELEASE_SOURCE_BRANCH,
    });
    const description = describeCIStatus(ciStatus);

    if (ciStatus.kind === "passed") {
      printSuccess(`${description} (${shortSHA(originDevelopSHA)})`);
    } else {
      printWarn(`${description} (${shortSHA(originDevelopSHA)})`);
      if (!yes && !(await promptToConfirm("Release anyway?"))) {
        throw new Error("Aborted.");
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. The plan, and the last chance to stop
  // ---------------------------------------------------------------------------
  const releaseTreeSHA = readTreeSHA(git, originDevelopSHA);
  const mainTreeSHA = readTreeSHA(git, originMainSHA);
  if (releaseTreeSHA === undefined) {
    throw new Error(
      `Could not read the tree of ${shortSHA(originDevelopSHA)}.`,
    );
  }

  printHeading("Plan");
  printDetails([
    [
      `1. ${RELEASE_SOURCE_BRANCH}:`,
      `${developVersion} to ${releaseVersion}, pushed`,
    ],
    [
      `2. ${RELEASE_TARGET_BRANCH}:`,
      `set to ${RELEASE_SOURCE_BRANCH}@${shortSHA(originDevelopSHA)}'s tree, ` +
        `tagged ${releaseTag}`,
    ],
    [
      `3. ${RELEASE_SOURCE_BRANCH}:`,
      `${releaseVersion} to ${toDevVersion(nextVersion)}, pushed`,
    ],
  ]);

  if (releaseTreeSHA === mainTreeSHA) {
    printWarn(
      `${RELEASE_SOURCE_BRANCH} and ${RELEASE_TARGET_BRANCH} already have ` +
        "identical content: this release ships no changes.",
    );
  }
  printWarn(
    `Pushing ${RELEASE_TARGET_BRANCH} deploys production and migrates the ` +
      "production database.",
  );

  if (
    !dryRun &&
    !yes &&
    !(await promptToConfirm(`Release ${releaseVersion}?`))
  ) {
    throw new Error("Aborted.");
  }

  // ---------------------------------------------------------------------------
  // 5. develop gets the release version
  // ---------------------------------------------------------------------------
  printHeading(`Setting ${RELEASE_SOURCE_BRANCH} to ${releaseVersion}`);
  if (developVersion === releaseVersion) {
    printSuccess(
      `package.json is already ${releaseVersion}; nothing to commit.`,
    );
  } else {
    commitVersion(git, {
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
        `Could not push ${RELEASE_SOURCE_BRANCH}: ${pushResult.stderr}\n` +
          "Nothing has been released. Fix the push and run the command again.",
      );
    }
  }

  // On a dry run no commit was made, so the release commit is develop's tip.
  const releaseSHA =
    dryRun ? originDevelopSHA : (revParse(git, "HEAD") ?? originDevelopSHA);
  const releaseTreeToPublish = readTreeSHA(git, releaseSHA) ?? releaseTreeSHA;

  // ---------------------------------------------------------------------------
  // 6. main becomes develop, tagged, pushed atomically
  // ---------------------------------------------------------------------------
  printHeading(
    `Building ${RELEASE_TARGET_BRANCH} from ${RELEASE_SOURCE_BRANCH}`,
  );
  const releaseCommitSHA = createReleaseCommit(git, {
    releaseTreeSHA: releaseTreeToPublish,
    mainParentSHA: originMainSHA,
    developParentSHA: releaseSHA,
    message:
      `Release ${releaseVersion}\n\n` +
      `Sets ${RELEASE_TARGET_BRANCH} to ${RELEASE_SOURCE_BRANCH}'s tree at ` +
      `${releaseSHA} verbatim. Written with git commit-tree, so this is a ` +
      "two-parent merge carrying develop's exact content with no merge " +
      "resolution. See apps/ava-cli/src/ReleaseCLI.",
  });

  // A dry run has no commit to push or tag, so stop before pretending to.
  if (dryRun) {
    printWarn(
      `Dry run: stopping before tagging and pushing ${RELEASE_TARGET_BRANCH}. ` +
        `The remaining steps would tag ${releaseTag}, push it with ` +
        `${RELEASE_TARGET_BRANCH} atomically, then set ` +
        `${RELEASE_SOURCE_BRANCH} to ${toDevVersion(nextVersion)}.`,
    );
    return;
  }
  if (releaseCommitSHA === undefined) {
    throw new Error("git commit-tree produced no commit.");
  }
  printDetail("release commit:", releaseCommitSHA);

  const tagResult = git.mutate("git", [
    "tag",
    "-a",
    releaseTag,
    "-m",
    releaseTag,
    releaseCommitSHA,
  ]);
  if (!tagResult.ok) {
    throw new Error(
      `Could not create tag ${releaseTag}: ${tagResult.stderr}\n` +
        `Nothing has been pushed to ${RELEASE_TARGET_BRANCH}.`,
    );
  }

  // Atomic: the branch and the tag land together or neither does. Without it, a
  // rejected branch update can still publish the tag, which then blocks the
  // retry that would have fixed the problem.
  const pushMainResult = git.mutate("git", [
    "push",
    "--atomic",
    "origin",
    `${releaseCommitSHA}:refs/heads/${RELEASE_TARGET_BRANCH}`,
    `refs/tags/${releaseTag}`,
  ]);
  if (!pushMainResult.ok) {
    git.mutateQuietly("git", ["tag", "-d", releaseTag]);
    throw new Error(
      `Could not push ${RELEASE_TARGET_BRANCH} and ${releaseTag}: ` +
        `${pushMainResult.stderr}\n` +
        `${RELEASE_SOURCE_BRANCH} is already at ${releaseVersion} and pushed, ` +
        "and the local tag has been removed. Retry with " +
        `--version ${releaseVersion} --next ${nextVersion}.`,
    );
  }
  printSuccess(
    `${RELEASE_TARGET_BRANCH} is at ${shortSHA(releaseCommitSHA)}, tagged ${releaseTag}.`,
  );

  // The local main ref is a convenience, not a source of truth: the release was
  // built from origin/main. Only move it when it is exactly where we started,
  // and never while another worktree has it checked out, since moving a ref
  // under a worktree makes that worktree report every file as deleted.
  const mainWorktree = findWorktreeForBranch(git, RELEASE_TARGET_BRANCH);
  if (mainWorktree !== undefined) {
    printWarn(
      `Local ${RELEASE_TARGET_BRANCH} is checked out at ${mainWorktree}, so it ` +
        "was left alone. Pull it there.",
    );
  } else if (localMainSHA === undefined || localMainSHA === originMainSHA) {
    git.mutate("git", [
      "update-ref",
      `refs/heads/${RELEASE_TARGET_BRANCH}`,
      releaseCommitSHA,
    ]);
  } else {
    printWarn(
      `Local ${RELEASE_TARGET_BRANCH} has diverged from origin, so it was left alone.`,
    );
  }

  // ---------------------------------------------------------------------------
  // 7. develop moves on
  // ---------------------------------------------------------------------------
  printHeading(
    `Setting ${RELEASE_SOURCE_BRANCH} to ${toDevVersion(nextVersion)}`,
  );
  try {
    commitVersion(git, {
      version: toDevVersion(nextVersion),
      message: `Bump version to ${toDevVersion(nextVersion)} [skip deploy]`,
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
      `${releaseTag} is released, but ${RELEASE_SOURCE_BRANCH} could not be ` +
        `bumped to ${toDevVersion(nextVersion)}: ${message}`,
    );
    throw new Error(
      `Set ${RELEASE_SOURCE_BRANCH} to ${toDevVersion(nextVersion)} and push it yourself.`,
    );
  }

  // ---------------------------------------------------------------------------
  // 8. Summary
  // ---------------------------------------------------------------------------
  printHeading(`Released ${releaseVersion}`);
  printSuccess(
    `${RELEASE_TARGET_BRANCH} = ${RELEASE_SOURCE_BRANCH}@${shortSHA(releaseSHA)}, ` +
      `tagged ${releaseTag}`,
  );
  printSuccess(`${RELEASE_SOURCE_BRANCH} = ${toDevVersion(nextVersion)}`);

  const remoteURL = git.readGit(["remote", "get-url", "origin"]) ?? "";
  const repoSlug = remoteURL
    .replace(/^git@github\.com:/, "")
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  if (/^[\w.-]+\/[\w.-]+$/.test(repoSlug)) {
    printInfo(
      `Production run: https://github.com/${repoSlug}/actions/workflows/production.yaml`,
    );
    printInfo(
      `Tag:            https://github.com/${repoSlug}/releases/tag/${releaseTag}`,
    );
  }
}
