import { checkSourceBranchCi } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import { describeCiStatus } from "@ava-cli/ReleaseCli/describeCiStatus/describeCiStatus";
import {
  DEPLOY_WARNING,
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
  TARGET_DEPLOY_WORKFLOW,
} from "@ava-cli/ReleaseCli/releaseBranches/releaseBranches";
import {
  getGitHubRepoSlug,
  readTreeSha,
  shortSha,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  printDetails,
  printHeading,
} from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers/releaseOutputHelpers";
import {
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { PublishReleaseNotesOutcome } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import type { ReleasePlan } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";

/**
 * The read-only confirmation and reporting stages of a release: these never
 * mutate git or GitHub state, they only check, print, confirm, and report.
 * The stages that do mutate state live in `releaseStageHelpers.ts`.
 */

/** What {@link confirmCiVerdict} checks, and whether it may ask or skip. */
type ConfirmCiVerdictOptions = {
  /** The source-branch commit being released. */
  commitSha: string;
  /** Stop on anything other than a pass instead of asking (`--yes`). */
  assumeYes: boolean;
  /** Skip the check entirely (`--skip-ci-check`). */
  skip: boolean;
};

/** The warning printed when `--skip-ci-check` skips the source branch's CI. */
const SKIP_CI_CHECK_WARNING = `Skipping ${RELEASE_SOURCE_BRANCH}'s CI check.`;

/**
 * The refusal `--yes` gives on a CI verdict other than a pass, which pushing
 * the target branch would otherwise deploy to production unreviewed.
 */
function _buildCiStopMessage(verdict: string): string {
  return `${verdict}
--yes does not release past ${RELEASE_SOURCE_BRANCH}'s CI unless it passed. Nothing has been released. To release anyway, run the command again with --skip-ci-check.`;
}

/**
 * Report the source branch's CI verdict for the commit being released. A pass
 * proceeds. Anything else asks, or under `--yes` throws before anything is
 * committed, tagged, or pushed. `--skip-ci-check` is the only override.
 */
export async function confirmCiVerdict(
  git: ReleaseCommands,
  options: Readonly<ConfirmCiVerdictOptions>,
): Promise<void> {
  const { commitSha, assumeYes, skip } = options;

  if (skip) {
    printWarn(SKIP_CI_CHECK_WARNING);
    return;
  }
  printHeading("CI");
  const ciStatus = checkSourceBranchCi(git, { commitSha });
  const verdict = `${describeCiStatus(ciStatus)} (${shortSha(commitSha)})`;

  if (ciStatus.kind === "passed") {
    printSuccess(verdict);
    return;
  }
  if (assumeYes) {
    throw new Error(_buildCiStopMessage(verdict));
  }
  printWarn(verdict);
  if (!(await promptToConfirm("Release anyway?"))) {
    throw new Error("Aborted.");
  }
}

/** The last-chance prompt, e.g. `Release 0.15.0?`. */
function _buildConfirmPrompt(plan: Readonly<ReleasePlan>): string {
  return `Release ${plan.releaseVersion}?`;
}

/** Print the three numbered steps the release will take. */
function _printPlanSteps(
  options: Readonly<{ plan: ReleasePlan; originSourceSha: string }>,
): void {
  const { plan, originSourceSha } = options;
  const { sourceVersion, releaseVersion, nextVersion, releaseTag } = plan;

  printHeading("Plan");
  printDetails([
    [
      `1. ${RELEASE_SOURCE_BRANCH}:`,
      `${sourceVersion} to ${releaseVersion}, pushed`,
    ],
    [
      `2. ${RELEASE_TARGET_BRANCH}:`,
      `set to ${RELEASE_SOURCE_BRANCH}@${shortSha(originSourceSha)}'s tree, tagged ${releaseTag}`,
    ],
    [
      `3. ${RELEASE_SOURCE_BRANCH}:`,
      `${releaseVersion} to ${toDevVersion(nextVersion)}, pushed`,
    ],
  ]);
}

/** What {@link confirmReleasePlan} prints and compares before asking. */
type ConfirmReleasePlanOptions = {
  plan: ReleasePlan;
  /** `origin/<source>`, the commit whose tree is released. */
  originSourceSha: string;
  /** `origin/<target>`, compared with the source to spot an empty release. */
  originTargetSha: string;
  /** Skip the confirmation prompt (`--yes`). */
  assumeYes: boolean;
};

/** Print what the release will do, then take the last chance to stop. */
export async function confirmReleasePlan(
  git: ReleaseCommands,
  options: Readonly<ConfirmReleasePlanOptions>,
): Promise<void> {
  const { plan, originSourceSha, originTargetSha, assumeYes } = options;

  _printPlanSteps({ plan, originSourceSha });
  if (readTreeSha(git, originSourceSha) === readTreeSha(git, originTargetSha)) {
    printWarn(
      `${RELEASE_SOURCE_BRANCH} and ${RELEASE_TARGET_BRANCH} already have identical content: this release ships no changes.`,
    );
  }
  printWarn(DEPLOY_WARNING);

  if (
    !git.dryRun &&
    !assumeYes &&
    !(await promptToConfirm(_buildConfirmPrompt(plan)))
  ) {
    throw new Error("Aborted.");
  }
}

/** The `ava release notes` command that retries this release's notes. */
function _buildReleaseNotesRetryHint(plan: Readonly<ReleasePlan>): string {
  return `Retry publishing release notes: ava release notes --version ${plan.releaseVersion}`;
}

/**
 * Reports the outcome of generating and publishing this release's GitHub
 * release notes, called right after the tag and the target branch are pushed
 * (or, on a dry run, right after the preview would have been generated).
 *
 * A failure here never fails the release: the target branch and the tag are
 * already live by the time this runs, so the only thing left to do is tell
 * the user how to retry the one step that didn't finish.
 */
export function reportReleaseNotesOutcome(
  outcome: PublishReleaseNotesOutcome,
  options: Readonly<{ plan: ReleasePlan; dryRun: boolean }>,
): void {
  const { plan, dryRun } = options;
  const { releaseTag } = plan;
  const retryHint = _buildReleaseNotesRetryHint(plan);

  switch (outcome.kind) {
    case "published":
      return;
    case "previewed":
      printHeading("Release notes (preview)");
      printInfo(outcome.notes);
      return;
    case "no-changes":
      printInfo(
        "No commits found since the previous tag; no release notes to publish.",
      );
      return;
    case "already-exists":
      // Retrying would just hit this same outcome again: `ava release
      // notes` refuses to overwrite an existing release's notes.
      printWarn(
        `Release notes already exist for ${releaseTag}: ${outcome.url}`,
      );
      return;
    case "tag-not-found":
      printWarn(
        `Could not find tag ${releaseTag} to publish release notes for.`,
      );
      if (!dryRun) {
        printWarn(retryHint);
      }
      return;
    case "failed":
      printWarn(`Could not publish release notes: ${outcome.reason}`);
      if (!dryRun) {
        printWarn(retryHint);
      }
      return;
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
    `Deploy run: https://github.com/${repoSlug}/actions/workflows/${TARGET_DEPLOY_WORKFLOW}`,
  );
  printInfo(
    `Tag:        https://github.com/${repoSlug}/releases/tag/${releaseTag}`,
  );
}
