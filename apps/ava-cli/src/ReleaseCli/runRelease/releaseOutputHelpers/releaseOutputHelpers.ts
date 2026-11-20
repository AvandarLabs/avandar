import { toDevVersion } from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import { Acclimate } from "@avandar/acclimate";
import { isDefined } from "@avandar/utils";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

/**
 * Terminal output helpers shared by the release stages: the opening banner,
 * headings, aligned label/value detail rows, and the version reference block.
 */

/** What a line's deploy reaches, for the banner. */
const BANNER_DEPLOY_NOTE: Readonly<Record<ReleaseLine["kind"], string>> = {
  alpha: "Deploys PRODUCTION (app.avandarlabs.com).",
  mainline: "Deploys the mainline test URL, not production.",
};

/**
 * The colored first line of `ava release`, naming the line being released and
 * what its deploy reaches, so a reviewer on the wrong branch notices before
 * answering any prompt.
 */
export function buildReleaseBanner(line: ReleaseLine): string {
  return `|${line.bannerColor}|${line.bannerTitle}|reset|: ${line.sourceBranch} to ${line.targetBranch}. ${BANNER_DEPLOY_NOTE[line.kind]}`;
}

/** Print the banner from {@link buildReleaseBanner}. */
export function printReleaseBanner(line: ReleaseLine): void {
  Acclimate.log(buildReleaseBanner(line));
}

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
  /** The line being released, which names the branches in each row. */
  line: ReleaseLine;
  /** The version on the release target branch, if it could be read. */
  targetVersion: string | undefined;
  /** The version currently on the source branch, e.g. `0.10.2-dev`. */
  sourceVersion: string;
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
    line,
    targetVersion,
    sourceVersion,
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
          `${suggestedNext} (patch bump, becomes ${toDevVersion(suggestedNext, line)})`,
        ] as const)
      : undefined;
  const details = [
    needsReleaseVersion
      ? ([
          `current on ${line.targetBranch}:`,
          targetVersion ?? "unknown",
        ] as const)
      : undefined,
    needsReleaseVersion
      ? ([`current on ${line.sourceBranch}:`, sourceVersion] as const)
      : undefined,
    needsReleaseVersion
      ? (["suggested release:", suggestedRelease] as const)
      : undefined,
    nextRow,
  ].filter(isDefined);

  printHeading("Versions");
  printDetails(details);
}
