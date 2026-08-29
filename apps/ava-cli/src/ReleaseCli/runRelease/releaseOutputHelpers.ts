import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
} from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import { Acclimate } from "@avandar/acclimate";
import { isDefined } from "@avandar/utils";

/**
 * Terminal output helpers shared by the release stages: headings, aligned
 * label/value detail rows, and the version reference block.
 */

/** A label/value pair rendered as one aligned detail row. */
export type ReleaseDetail = readonly [label: string, value: string];

/** Print a section heading, preceded by a blank line. */
export function printHeading(heading: string): void {
  Acclimate.log("\n|bright_white|$heading$|reset|", { heading });
}

/** Print one indented `label value` row. */
export function printDetail(label: string, value: string): void {
  Acclimate.log("  |gray|$label$|reset| $value$", { label, value });
}

/**
 * Print label/value rows with the labels padded to a common width, so values
 * line up regardless of how long the branch names are.
 */
export function printDetails(details: readonly ReleaseDetail[]): void {
  const labelWidth = Math.max(
    ...details.map(([label]) => {
      return label.length;
    }),
  );
  details.forEach(([label, value]) => {
    printDetail(label.padEnd(labelWidth, " "), value);
  });
}

/** What the version reference block needs in order to be useful. */
export type VersionReferenceOptions = {
  /** The version on the release target branch, if it could be read. */
  mainVersion: string | undefined;
  /** The version currently on the source branch, e.g. `0.10.2-dev`. */
  developVersion: string;
  /** The release version we would suggest. */
  suggestedRelease: string;
  /** The next version we would suggest, when one can be derived. */
  suggestedNext: string | undefined;
  /** Whether the release version still has to be asked for. */
  needsReleaseVersion: boolean;
  /** Whether the next version still has to be asked for. */
  needsNextVersion: boolean;
};

/**
 * Print the versions the reviewer needs in order to answer the prompts.
 *
 * Only the rows relevant to an unanswered question are printed: an option that
 * was already passed on the command line raises no prompt, so its reference
 * values would be noise.
 */
export function printVersionReference(
  options: Readonly<VersionReferenceOptions>,
): void {
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

  const nextRow =
    needsNextVersion && isDefined(suggestedNext)
      ? ([
          "suggested next:",
          `${suggestedNext} (patch bump, becomes ${toDevVersion(suggestedNext)})`,
        ] as const)
      : undefined;
  const details = [
    needsReleaseVersion
      ? ([
          `current on ${RELEASE_TARGET_BRANCH}:`,
          mainVersion ?? "unknown",
        ] as const)
      : undefined,
    needsReleaseVersion
      ? ([`current on ${RELEASE_SOURCE_BRANCH}:`, developVersion] as const)
      : undefined,
    needsReleaseVersion
      ? (["suggested release:", suggestedRelease] as const)
      : undefined,
    nextRow,
  ].filter(isDefined);

  printHeading("Versions");
  printDetails(details);
}
