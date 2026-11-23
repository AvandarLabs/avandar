import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  suggestNextVersion,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

/**
 * Resolving the two versions a release needs, from the command line when they
 * were passed and from the reviewer otherwise.
 */

/** How a version was arrived at: an option, a suggestion, or an answer. */
type ResolveVersionOptions = {
  /** The line being released, which words the prompts. */
  line: ReleaseLine;
  /** The value passed on the command line, when there was one. */
  provided: string | undefined;
  /** Accept every suggestion without asking. */
  assumeYes: boolean;
};

/**
 * The release-version prompt. A line whose releases carry a suffix (`-alpha`)
 * says it is added, so the reviewer types a bare `X.Y.Z`.
 */
function _buildReleaseVersionPrompt(line: ReleaseLine): string {
  const question = "What version number do you want for this release?";
  return line.releaseSuffix.length > 0
    ? `${question} (${line.releaseSuffix} is added automatically)`
    : question;
}

/**
 * Resolve the version being released, as a bare `X.Y.Z`. The line's release
 * suffix is added later, when the version is written and tagged.
 */
export async function resolveReleaseVersion(
  options: Readonly<ResolveVersionOptions & { suggested: string }>,
): Promise<string> {
  const { line, provided, suggested, assumeYes } = options;

  if (provided !== undefined) {
    return _requireValidVersion(provided, "The release version");
  }
  return assumeYes
    ? suggested
    : promptForVersion({
        message: _buildReleaseVersionPrompt(line),
        defaultValue: suggested,
        label: "The release version",
      });
}

/** Resolve the version the source branch moves to after the release. */
export async function resolveNextVersion(
  options: Readonly<ResolveVersionOptions & { releaseVersion: string }>,
): Promise<string> {
  const { line, provided, releaseVersion, assumeYes } = options;

  if (provided !== undefined) {
    return _requireValidVersion(provided, "The next version");
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
    message: `Which version should ${line.sourceBranch} move to next?`,
    defaultValue: suggested,
    label: "The next version",
  });
}

/** The trimmed version, or a thrown error naming what was wrong with it. */
function _requireValidVersion(version: string, label: string): string {
  const validation = validateReleaseVersion(version, label);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  return version.trim();
}
