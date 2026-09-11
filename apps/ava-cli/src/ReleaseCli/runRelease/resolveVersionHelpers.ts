import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  suggestNextVersion,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import { RELEASE_SOURCE_BRANCH } from "@ava-cli/ReleaseCli/runPreflight/runPreflight";

/**
 * Resolving the two versions a release needs, from the command line when they
 * were passed and from the reviewer otherwise.
 */

/** How a version was arrived at: an option, a suggestion, or an answer. */
type ResolveVersionOptions = {
  /** The value passed on the command line, when there was one. */
  provided: string | undefined;
  /** Accept every suggestion without asking. */
  assumeYes: boolean;
};

/** Resolve the version being released. */
export async function resolveReleaseVersion(
  options: Readonly<ResolveVersionOptions & { suggested: string }>,
): Promise<string> {
  const { provided, suggested, assumeYes } = options;

  if (provided !== undefined) {
    return _requireValidVersion(provided, "The release version");
  }
  return assumeYes
    ? suggested
    : promptForVersion({
        message: "Which version are you releasing?",
        defaultValue: suggested,
        label: "The release version",
      });
}

/** Resolve the version the source branch moves to after the release. */
export async function resolveNextVersion(
  options: Readonly<ResolveVersionOptions & { releaseVersion: string }>,
): Promise<string> {
  const { provided, releaseVersion, assumeYes } = options;

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
    message: `Which version should ${RELEASE_SOURCE_BRANCH} move to next?`,
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
