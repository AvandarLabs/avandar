/**
 * Version arithmetic and validation for `ava release`.
 *
 * Kept free of git and I/O so the rules that decide what gets tagged are
 * testable on their own.
 */

import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

/** `X.Y.Z`, with nothing before or after. */
const RELEASE_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export type VersionValidationResult =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; message: string }>;

/**
 * Validates a version the user typed or passed as an option.
 *
 * Rejects the two mistakes that are easy to make and expensive to undo: a `v`
 * prefix (the git tag adds that, so `vv0.1.0` would be published) and a
 * `-dev` or `-alpha` suffix (this command adds the suffix from the release
 * line itself, so a typed one would be doubled).
 */
export function validateReleaseVersion(
  version: string,
  label: string,
): VersionValidationResult {
  const trimmed = version.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: `${label} cannot be empty.` };
  }
  if (trimmed.startsWith("v")) {
    return {
      valid: false,
      message: `${label} must not start with "v" (the git tag adds it): ${trimmed}`,
    };
  }
  if (trimmed.endsWith("dev") || trimmed.endsWith("alpha")) {
    return {
      valid: false,
      message: `${label} must not end with "dev" or "alpha" (it is added automatically): ${trimmed}`,
    };
  }
  if (!RELEASE_VERSION_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: `${label} must look like X.Y.Z (for example 0.11.0): ${trimmed}`,
    };
  }
  return { valid: true };
}

/**
 * Strips any prerelease suffix, so a source branch's `0.10.2-dev` or
 * `0.15.1-alpha-dev` yields the release it is working towards: `0.10.2` or
 * `0.15.1`.
 */
export function toReleaseVersion(sourceVersion: string): string {
  const [releaseVersion] = sourceVersion.trim().split("-");
  return releaseVersion ?? sourceVersion.trim();
}

/**
 * Suggests the next version after a release: a patch bump.
 *
 * A patch bump is what the tag history actually shows (0.9.0, 0.9.1, 0.9.2,
 * 0.10.0, 0.10.1), and it is the safe default to accept blindly. A minor or
 * major bump is a deliberate decision, so it is typed in by hand.
 *
 * Returns `undefined` when the input is not an `X.Y.Z` version, in which case
 * there is no sensible suggestion to make.
 */
export function suggestNextVersion(releaseVersion: string): string | undefined {
  const trimmed = toReleaseVersion(releaseVersion);
  if (!RELEASE_VERSION_REGEX.test(trimmed)) {
    return undefined;
  }

  const [major, minor, patch] = trimmed.split(".");
  const patchNumber = Number.parseInt(patch ?? "", 10);
  if (Number.isNaN(patchNumber)) {
    return undefined;
  }
  return `${major}.${minor}.${patchNumber + 1}`;
}

/**
 * The version the line's source branch moves to after a release, e.g.
 * `0.10.3-dev` on mainline or `0.15.1-alpha-dev` on alpha.
 */
export function toDevVersion(version: string, line: ReleaseLine): string {
  return `${version}${line.devSuffix}`;
}

/**
 * The version written to package.json on release, e.g. `0.10.2` on mainline
 * or `0.15.0-alpha` on alpha.
 */
export function toPublishedVersion(version: string, line: ReleaseLine): string {
  return `${version}${line.releaseSuffix}`;
}

/** The git tag for a release, e.g. `v0.10.2` or `v0.15.0-alpha`. */
export function toReleaseTag(version: string, line: ReleaseLine): string {
  return `v${toPublishedVersion(version, line)}`;
}
