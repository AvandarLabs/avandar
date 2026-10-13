import { checkDevelopCi } from "@ava-cli/ReleaseCli/checkDevelopCi";
import { describeCiStatus } from "@ava-cli/ReleaseCli/describeCiStatus";
import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  getGitHubRepoSlug,
  readTreeSha,
  shortSha,
} from "@ava-cli/ReleaseCli/releaseGitHelpers";
import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
} from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import {
  printDetails,
  printHeading,
} from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers";
import type { ReleasePlan } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";
import type { PublishReleaseNotesOutcome } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import {
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/**
 * The read-only confirmation and reporting stages of a release: these never
 * mutate git or GitHub state, they only check, print, confirm, and report.
 * The stages that do mutate state live in `releaseStageHelpers.ts`.
 */

/**
 * Report the staging CI verdict for the commit being released, and ask before
 * proceeding on anything other than a pass.
 */
export async function confirmCiVerdict(
  git: ReleaseCommands,
  options: Readonly<{ commitSha: string; assumeYes: boolean; skip: boolean }>,
): Promise<void> {
  const { commitSha, assumeYes, skip } = options;

  if (skip) {
    printWarn("Skipping the staging CI check.");
    return;
  }
  printHeading("CI");
  const ciStatus = checkDevelopCi(git, {
    commitSha,
    branch: RELEASE_SOURCE_BRANCH,
  });
  const verdict = `${describeCiStatus(ciStatus)} (${shortSha(commitSha)})`;

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
 * Reports the outcome of generating and publishing this release's GitHub
 * release notes, called right after the tag and main are pushed (or, on a
 * dry run, right after the preview would have been generated).
 *
 * A failure here never fails the release: main and the tag are already live
 * by the time this runs, so the only thing left to do is tell the user how
 * to retry the one step that didn't finish.
 */
export function reportReleaseNotesOutcome(
  outcome: PublishReleaseNotesOutcome,
  options: Readonly<{ releaseVersion: string; dryRun: boolean }>,
): void {
  const { releaseVersion, dryRun } = options;
  const retryHint = `Retry publishing release notes: ava release notes --version ${releaseVersion}`;

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
        `Release notes already exist for v${releaseVersion}: ${outcome.url}`,
      );
      return;
    case "tag-not-found":
      printWarn(
        `Could not find tag v${releaseVersion} to publish release notes for.`,
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
    `Production run: https://github.com/${repoSlug}/actions/workflows/production.yaml`,
  );
  printInfo(
    `Tag:            https://github.com/${repoSlug}/releases/tag/${releaseTag}`,
  );
}
