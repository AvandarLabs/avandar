import type { ReleaseCommands } from "@ava-cli/ReleaseCLI/createReleaseCommands";
import type { PreflightResult } from "@ava-cli/ReleaseCLI/runPreflight/runPreflight";
import type { ReleasePlan } from "@ava-cli/ReleaseCLI/runRelease/releaseStageHelpers";

import { createReleaseCommands } from "@ava-cli/ReleaseCLI/createReleaseCommands";
import { readVersionAtRevision } from "@ava-cli/ReleaseCLI/releaseGitHelpers";
import {
  suggestNextVersion,
  toReleaseTag,
  toReleaseVersion,
} from "@ava-cli/ReleaseCLI/releaseVersionUtils/releaseVersionUtils";
import {
  RELEASE_SOURCE_BRANCH,
  runPreflight,
} from "@ava-cli/ReleaseCLI/runPreflight/runPreflight";
import {
  printHeading,
  printVersionReference,
} from "@ava-cli/ReleaseCLI/runRelease/releaseOutputHelpers";
import {
  assertTagIsUnused,
  bumpDevelopToNextVersion,
  commitReleaseVersionOnDevelop,
  confirmCIVerdict,
  confirmReleasePlan,
  printReleaseSummary,
  publishMainAndTag,
  updateLocalMainRef,
} from "@ava-cli/ReleaseCLI/runRelease/releaseStageHelpers";
import {
  resolveNextVersion,
  resolveReleaseVersion,
} from "@ava-cli/ReleaseCLI/runRelease/resolveVersionHelpers";
import { printSuccess, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";

/** Everything `ava release` accepts, already parsed. */
export type ReleaseOptions = {
  /** Version to release. Prompted for when omitted. */
  version: string | undefined;
  /** Version the source branch moves to; gains `-dev`. Asked for if omitted. */
  nextVersion: string | undefined;
  /** Accept every default and skip confirmations. */
  yes: boolean;
  /** Print every mutating command without running it. */
  dryRun: boolean;
  /** Skip the staging CI check. */
  skipCICheck: boolean;
};

/** A preflight that passed, so its refs are known. */
type SatisfiedPreflight = Extract<PreflightResult, { ok: true }>;

/**
 * Release the Avandar app: the target branch becomes an exact copy of the
 * source branch, tagged `vX.Y.Z`, and the source branch moves on to the next
 * `-dev` version.
 *
 * The release is a straight cut, not a content merge, so it cannot conflict.
 * See `createReleaseCommit` for how that is achieved. Throws with a message
 * naming what has and has not happened when any stage fails.
 */
export async function runRelease(
  options: Readonly<ReleaseOptions>,
): Promise<void> {
  const { yes, dryRun, skipCICheck } = options;

  const git = createReleaseCommands({ repoRoot: _requireRepoRoot(), dryRun });
  if (dryRun) {
    printWarn("Dry run: no local or remote state will change.");
  }

  // Nothing runs until preflight is satisfied, and nothing is pushed until the
  // plan is confirmed.
  const preflight = _requirePreflight(git);
  const { originDevelopSha, originMainSha, localMainSha } = preflight;
  const plan = await _resolvePlan(git, options, preflight);
  assertTagIsUnused(git, plan);
  await confirmCIVerdict(git, {
    commitSha: originDevelopSha,
    assumeYes: yes,
    skip: skipCICheck,
  });
  await confirmReleasePlan(git, {
    plan,
    originDevelopSha,
    originMainSha,
    assumeYes: yes,
  });

  const releaseSha = commitReleaseVersionOnDevelop(git, {
    plan,
    originDevelopSha,
  });
  const releaseCommitSha = publishMainAndTag(git, {
    plan,
    releaseSha,
    originMainSha,
  });
  // A dry run pushes nothing, so there is nothing left to do.
  if (releaseCommitSha === undefined) {
    return;
  }
  updateLocalMainRef(git, { releaseCommitSha, localMainSha, originMainSha });
  bumpDevelopToNextVersion(git, plan);
  printReleaseSummary(git, { plan, releaseSha });
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
async function _resolvePlan(
  git: ReleaseCommands,
  options: Readonly<ReleaseOptions>,
  preflight: SatisfiedPreflight,
): Promise<ReleasePlan> {
  const { version, nextVersion, yes } = options;
  const { originDevelopSha, originMainSha } = preflight;

  const developVersion = readVersionAtRevision(git, originDevelopSha);
  if (developVersion === undefined) {
    throw new Error(
      `Could not read the version from package.json on ${RELEASE_SOURCE_BRANCH}.`,
    );
  }
  const suggestedRelease = toReleaseVersion(developVersion);
  printVersionReference({
    mainVersion: readVersionAtRevision(git, originMainSha),
    developVersion,
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
    developVersion,
    releaseVersion,
    nextVersion: await resolveNextVersion({
      provided: nextVersion,
      releaseVersion,
      assumeYes: yes,
    }),
    releaseTag: toReleaseTag(releaseVersion),
  };
}
