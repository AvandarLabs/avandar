import { branchNameToCommitType } from "../branchNameToCommitType/branchNameToCommitType";
import { parseConventionalCommitTitle } from "../parseConventionalCommitTitle/parseConventionalCommitTitle";

export type SemverBump = "patch" | "minor" | "major";

export type InferBumpTypeInput = {
  prTitle: string;
  prBody: string;
  branchName: string;
  currentMajorVersion: number;
};

const MINOR_TYPES: ReadonlySet<string> = new Set(["feat"]);
const BREAKING_CHANGE_FOOTER_PATTERN = /^BREAKING CHANGE:/m;

function baseBumpForType(type: string): SemverBump {
  return MINOR_TYPES.has(type) ? "minor" : "patch";
}

/**
 * Infers the semver bump for a PR from its title (Conventional Commits),
 * falling back to its branch name prefix when the title does not parse.
 * Caps an inferred major bump to minor while the repo is pre-1.0, since
 * nothing here should cross 0.x to 1.0.0 without a human deciding to.
 */
export function inferBumpType(input: InferBumpTypeInput): SemverBump {
  const { prTitle, prBody, branchName, currentMajorVersion } = input;

  const parsedTitle = parseConventionalCommitTitle(prTitle);
  const type = parsedTitle?.type ?? branchNameToCommitType(branchName);

  if (type === null || type === undefined) {
    return "patch";
  }

  const isBreaking =
    (parsedTitle?.breaking ?? false) ||
    BREAKING_CHANGE_FOOTER_PATTERN.test(prBody);

  const bump: SemverBump = isBreaking ? "major" : baseBumpForType(type);

  return bump === "major" && currentMajorVersion === 0 ? "minor" : bump;
}
