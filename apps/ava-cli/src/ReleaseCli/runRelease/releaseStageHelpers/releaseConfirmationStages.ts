import { checkSourceBranchCi } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import { describeCiStatus } from "@ava-cli/ReleaseCli/describeCiStatus/describeCiStatus";
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
import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
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
  /** The line released, which names the branch and workflow to check. */
  line: ReleaseLine;
  /**
   * Release on anything other than a pass without asking. Only the mainline
   * honors it: the alpha line refuses every verdict but a pass regardless.
   */
  assumeYes: boolean;
  /** Skip the check entirely (`--skip-ci-check`). */
  skip: boolean;
};

/**
 * What each line does with a source-branch CI verdict other than a pass:
 * the mainline asks (or proceeds under `--yes`), while the alpha line, which
 * deploys production, refuses outright so `--yes` can never release a red
 * or unverified build to production.
 */
const NON_PASSING_CI_POLICY_BY_LINE_KIND: Readonly<
  Record<ReleaseLine["kind"], "ask" | "refuse">
> = {
  alpha: "refuse",
  mainline: "ask",
};

/** The warning printed when `--skip-ci-check` skips the line's CI check. */
function _buildSkipCiCheckWarning(line: ReleaseLine): string {
  const skipping = `Skipping ${line.sourceBranch}'s CI check.`;
  return line.kind === "alpha"
    ? `${skipping} PRODUCTION will deploy without ${line.sourceBranch}'s CI verdict on this commit.`
    : skipping;
}

/**
 * The refusal for a non-passing verdict on a line that refuses one, naming
 * the verdict, its description (with the run URL when a run exists), and the
 * two ways forward.
 */
function _buildCiRefusalMessage(
  options: Readonly<{ status: CiStatus; line: ReleaseLine; verdict: string }>,
): string {
  const { status, line, verdict } = options;
  return [
    `Refusing to release: ${line.sourceBranch}'s CI verdict is "${status.kind}", not "passed".`,
    verdict,
    `Wait for ${line.sourceBranch}'s CI to pass on this commit, or pass --skip-ci-check to release without it. --yes does not override this.`,
  ].join("\n");
}

/**
 * Report the source branch's CI verdict for the commit being released. A pass
 * proceeds. Anything else refuses on the alpha line, whatever `--yes` says,
 * and asks (or proceeds under `--yes`) on the mainline.
 */
export async function confirmCiVerdict(
  git: ReleaseCommands,
  options: Readonly<ConfirmCiVerdictOptions>,
): Promise<void> {
  const { commitSha, line, assumeYes, skip } = options;

  if (skip) {
    printWarn(_buildSkipCiCheckWarning(line));
    return;
  }
  printHeading("CI");
  const ciStatus = checkSourceBranchCi(git, { commitSha, line });
  const verdict = `${describeCiStatus({ status: ciStatus, line })} (${shortSha(commitSha)})`;

  if (ciStatus.kind === "passed") {
    printSuccess(verdict);
    return;
  }
  printWarn(verdict);
  if (NON_PASSING_CI_POLICY_BY_LINE_KIND[line.kind] === "refuse") {
    throw new Error(
      _buildCiRefusalMessage({ status: ciStatus, line, verdict }),
    );
  }
  if (!assumeYes && !(await promptToConfirm("Release anyway?"))) {
    throw new Error("Aborted.");
  }
}

/**
 * What the last-chance prompt adds after the version, by line, so the prompt
 * on the line that deploys production says so.
 */
const CONFIRM_PROMPT_DESTINATION: Readonly<
  Record<ReleaseLine["kind"], string>
> = {
  alpha: " to PRODUCTION",
  mainline: "",
};

/** The last-chance prompt, e.g. `Release 0.15.0-alpha to PRODUCTION?`. */
function _buildConfirmPrompt(plan: Readonly<ReleasePlan>): string {
  const { line, publishedVersion } = plan;
  return `Release ${publishedVersion}${CONFIRM_PROMPT_DESTINATION[line.kind]}?`;
}

/** Print the three numbered steps the release will take. */
function _printPlanSteps(
  options: Readonly<{ plan: ReleasePlan; originSourceSha: string }>,
): void {
  const { plan, originSourceSha } = options;
  const { line, sourceVersion, publishedVersion, nextVersion, releaseTag } =
    plan;

  printHeading("Plan");
  printDetails([
    [
      `1. ${line.sourceBranch}:`,
      `${sourceVersion} to ${publishedVersion}, pushed`,
    ],
    [
      `2. ${line.targetBranch}:`,
      `set to ${line.sourceBranch}@${shortSha(originSourceSha)}'s tree, tagged ${releaseTag}`,
    ],
    [
      `3. ${line.sourceBranch}:`,
      `${publishedVersion} to ${toDevVersion(nextVersion, line)}, pushed`,
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
  const { line } = plan;

  _printPlanSteps({ plan, originSourceSha });
  if (readTreeSha(git, originSourceSha) === readTreeSha(git, originTargetSha)) {
    printWarn(
      `${line.sourceBranch} and ${line.targetBranch} already have identical content: this release ships no changes.`,
    );
  }
  printWarn(line.deployWarning);

  if (
    !git.dryRun &&
    !assumeYes &&
    !(await promptToConfirm(_buildConfirmPrompt(plan)))
  ) {
    throw new Error("Aborted.");
  }
}

/**
 * The flag `ava release notes` needs to find each line's tag, so the retry
 * hint names the tag this release actually created.
 */
const RELEASE_NOTES_LINE_FLAG: Readonly<Record<ReleaseLine["kind"], string>> = {
  alpha: " --alpha",
  mainline: "",
};

/** The `ava release notes` command that retries this release's notes. */
function _buildReleaseNotesRetryHint(plan: Readonly<ReleasePlan>): string {
  const { line, releaseVersion } = plan;
  return `Retry publishing release notes: ava release notes --version ${releaseVersion}${RELEASE_NOTES_LINE_FLAG[line.kind]}`;
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
  const { line, publishedVersion, nextVersion, releaseTag } = plan;

  printHeading(`Released ${publishedVersion}`);
  printSuccess(
    `${line.targetBranch} = ${line.sourceBranch}@${shortSha(releaseSha)}, tagged ${releaseTag}`,
  );
  printSuccess(`${line.sourceBranch} = ${toDevVersion(nextVersion, line)}`);

  const repoSlug = getGitHubRepoSlug(git);
  if (repoSlug === undefined) {
    return;
  }
  printInfo(
    `Deploy run: https://github.com/${repoSlug}/actions/workflows/${line.targetDeployWorkflow}`,
  );
  printInfo(
    `Tag:        https://github.com/${repoSlug}/releases/tag/${releaseTag}`,
  );
}
