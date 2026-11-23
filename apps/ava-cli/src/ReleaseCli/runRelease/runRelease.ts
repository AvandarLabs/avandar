import { createReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import { RELEASE_SOURCE_BRANCH } from "@ava-cli/ReleaseCli/releaseBranches/releaseBranches";
import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { readVersionAtRevision } from "@ava-cli/ReleaseCli/releaseGitHelpers";
import {
  suggestNextVersion,
  toReleaseTag,
  toReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import { runPreflight } from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import {
  printHeading,
  printVersionReference,
} from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers/releaseOutputHelpers";
import {
  confirmCiVerdict,
  confirmReleasePlan,
  printReleaseSummary,
  reportReleaseNotesOutcome,
} from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseConfirmationStages";
import {
  assertTagIsUnused,
  bumpSourceToNextVersion,
  commitReleaseVersionOnSource,
  publishTargetAndTag,
  updateLocalTargetRef,
} from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";
import {
  resolveNextVersion,
  resolveReleaseVersion,
} from "@ava-cli/ReleaseCli/runRelease/resolveVersionHelpers/resolveVersionHelpers";
import { printSuccess, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { PreflightResult } from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import type { ReleasePlan } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";

/** Everything `ava release` accepts, already parsed. */
export type ReleaseOptions = {
  /** Version to release. Prompted for when omitted. */
  version: string | undefined;
  /** Version the source branch moves to. It gains `-dev`. Asked for if omitted. */
  nextVersion: string | undefined;
  /** Accept every default and skip confirmations. */
  yes: boolean;
  /** Print every mutating command without running it. */
  dryRun: boolean;
  /** Skip the source branch's CI check. */
  skipCiCheck: boolean;
  /** Skip generating and publishing GitHub release notes. */
  skipChangelog: boolean;
};

/** A preflight that passed, so its refs are known. */
type SatisfiedPreflight = Extract<PreflightResult, { ok: true }>;

/** What a release plan is built from: the parsed options and the preflight. */
type PlanSourceOptions = {
  releaseOptions: Readonly<ReleaseOptions>;
  preflight: SatisfiedPreflight;
};

/** What {@link _finishPublishedRelease} needs once the target is pushed. */
type FinishPublishedReleaseOptions = {
  plan: ReleasePlan;
  preflight: SatisfiedPreflight;
  /** The source-side commit that was released. */
  releaseSha: string;
  /** The target branch's new commit. */
  releaseCommitSha: string;
};

/**
 * Release `develop`: `main` becomes an exact copy of `develop`, tagged, and
 * `develop` moves to its next dev version. Any other checked-out branch is
 * refused.
 *
 * The release is a straight cut, not a content merge, so it cannot conflict.
 * See `createReleaseCommit` for how that is achieved. Throws with a message
 * naming what has and has not happened when any stage fails.
 */
export async function runRelease(
  options: Readonly<ReleaseOptions>,
): Promise<void> {
  const { dryRun, skipChangelog } = options;

  const git = createReleaseCommands({ repoRoot: _requireRepoRoot(), dryRun });
  if (dryRun) {
    printWarn("Dry run: no local or remote state will change.");
  }

  // Nothing runs until preflight is satisfied, and nothing is pushed until the
  // plan is confirmed.
  const preflight = _requirePreflight(git);
  const planSource = { releaseOptions: options, preflight };
  const plan = await _buildConfirmedPlan(git, planSource);
  const { releaseSha, releaseCommitSha } = _publishRelease(git, {
    plan,
    preflight,
  });

  // A dry run pushes nothing, so the changelog preview happens here, with the
  // source-side commit standing in for the tag that was never created.
  if (releaseCommitSha === undefined) {
    await _publishReleaseNotesIfEnabled(git, {
      skipChangelog,
      dryRun,
      plan,
      headRevisionOverride: releaseSha,
    });
    return;
  }

  _finishPublishedRelease(git, {
    plan,
    preflight,
    releaseSha,
    releaseCommitSha,
  });

  // Runs last, once the source branch is back on a dev version: a slow or
  // failing OpenAI/gh call must never delay getting the repo usable again.
  await _publishReleaseNotesIfEnabled(git, { skipChangelog, dryRun, plan });
}

/**
 * The plan for this release once the reviewer has confirmed it: the versions
 * are resolved, the tag is unused, and the CI verdict and the plan itself
 * have been accepted. Throws when any of those refuses.
 */
async function _buildConfirmedPlan(
  git: ReleaseCommands,
  options: Readonly<PlanSourceOptions>,
): Promise<ReleasePlan> {
  const { releaseOptions, preflight } = options;
  const { yes, skipCiCheck } = releaseOptions;
  const { originSourceSha, originTargetSha } = preflight;

  const plan = await _buildPlan(git, options);
  assertTagIsUnused(git, plan);
  await confirmCiVerdict(git, {
    commitSha: originSourceSha,
    assumeYes: yes,
    skip: skipCiCheck,
  });
  await confirmReleasePlan(git, {
    plan,
    originSourceSha,
    originTargetSha,
    assumeYes: yes,
  });
  return plan;
}

/**
 * Put the release version on the source branch, then build, tag, and push the
 * target branch. `releaseSha` is the source-side commit released, and
 * `releaseCommitSha` the target's new commit, undefined on a dry run.
 */
function _publishRelease(
  git: ReleaseCommands,
  options: Readonly<{ plan: ReleasePlan; preflight: SatisfiedPreflight }>,
): { releaseSha: string; releaseCommitSha: string | undefined } {
  const { plan, preflight } = options;

  const releaseSha = commitReleaseVersionOnSource(git, {
    plan,
    originSourceSha: preflight.originSourceSha,
  });
  const releaseCommitSha = publishTargetAndTag(git, {
    plan,
    releaseSha,
    originTargetSha: preflight.originTargetSha,
  });
  return { releaseSha, releaseCommitSha };
}

/**
 * The steps after the target branch and tag are pushed: fast-forward the local
 * target branch, move the source branch to its next dev version, and print
 * the summary.
 */
function _finishPublishedRelease(
  git: ReleaseCommands,
  options: Readonly<FinishPublishedReleaseOptions>,
): void {
  const { plan, preflight, releaseSha, releaseCommitSha } = options;

  updateLocalTargetRef(git, {
    releaseCommitSha,
    localTargetSha: preflight.localTargetSha,
    originTargetSha: preflight.originTargetSha,
  });
  bumpSourceToNextVersion(git, plan);
  printReleaseSummary(git, { plan, releaseSha });
}

/** Options accepted by {@link _publishReleaseNotesIfEnabled}. */
type PublishReleaseNotesIfEnabledOptions = Readonly<{
  skipChangelog: boolean;
  dryRun: boolean;
  plan: ReleasePlan;
  /**
   * The commit to diff from, when `plan.releaseTag` does not exist yet
   * (a dry-run preview).
   */
  headRevisionOverride?: string;
}>;

/**
 * Generates and publishes this release's GitHub release notes, unless
 * `--skip-changelog` was passed, reporting the outcome either way.
 */
async function _publishReleaseNotesIfEnabled(
  git: ReleaseCommands,
  options: PublishReleaseNotesIfEnabledOptions,
): Promise<void> {
  const { skipChangelog, dryRun, plan, headRevisionOverride } = options;
  if (skipChangelog) {
    return;
  }
  const outcome = await publishReleaseNotes(git, {
    releaseTag: plan.releaseTag,
    dryRun,
    ...(headRevisionOverride !== undefined
      ? { headRevision: headRevisionOverride, skipExistenceChecks: true }
      : {}),
  });
  reportReleaseNotesOutcome(outcome, { plan, dryRun });
}

/** The repo the release operates on, or a thrown error naming the problem. */
function _requireRepoRoot(): string {
  const repoRoot = findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error(
      "Could not find the Avandar repo root. Run this from inside the repository.",
    );
  }
  return repoRoot;
}

/** The satisfied preflight, or a thrown error carrying its refusal. */
function _requirePreflight(git: ReleaseCommands): SatisfiedPreflight {
  printHeading("Preflight");
  const preflight = runPreflight(git);
  if (!preflight.ok) {
    throw new Error(preflight.message);
  }
  printSuccess(
    `On ${RELEASE_SOURCE_BRANCH}, clean, in sync with origin/${RELEASE_SOURCE_BRANCH}.`,
  );
  return preflight;
}

/**
 * The versions and tag this release is cut with, printing the reference block
 * and asking for whatever was not passed as an option.
 */
async function _buildPlan(
  git: ReleaseCommands,
  options: Readonly<PlanSourceOptions>,
): Promise<ReleasePlan> {
  const { version, nextVersion, yes } = options.releaseOptions;
  const { originTargetSha } = options.preflight;

  const sourceVersion = _requireSourceVersion(git, options.preflight);
  const suggestedRelease = toReleaseVersion(sourceVersion);
  printVersionReference({
    targetVersion: readVersionAtRevision(git, originTargetSha),
    sourceVersion,
    suggestedRelease,
    suggestedNext: suggestNextVersion(version ?? suggestedRelease),
    needsReleaseVersion: version === undefined,
    needsNextVersion: nextVersion === undefined,
  });

  const releaseVersion = await resolveReleaseVersion({
    provided: version,
    suggested: suggestedRelease,
    assumeYes: yes,
  });
  return {
    sourceVersion,
    releaseVersion,
    nextVersion: await resolveNextVersion({
      provided: nextVersion,
      releaseVersion,
      assumeYes: yes,
    }),
    releaseTag: toReleaseTag(releaseVersion),
  };
}

/** The version on `origin/<source>`, or a thrown error when unreadable. */
function _requireSourceVersion(
  git: ReleaseCommands,
  preflight: SatisfiedPreflight,
): string {
  const sourceVersion = readVersionAtRevision(git, preflight.originSourceSha);
  if (sourceVersion === undefined) {
    throw new Error(
      `Could not read the version from package.json on ${RELEASE_SOURCE_BRANCH}.`,
    );
  }
  return sourceVersion;
}
