export type ConventionalCommitTitle = {
  type: string;
  scope: string | undefined;
  breaking: boolean;
  description: string;
};

const CONVENTIONAL_COMMIT_TITLE_PATTERN =
  /^([a-z]+)(\(([^)]+)\))?(!)?:\s+(.+)$/;

/**
 * Parses a PR title as a Conventional Commit header
 * (`type(scope)!: description`), or returns undefined when it does not
 * match.
 */
export function parseConventionalCommitTitle(
  title: string,
): ConventionalCommitTitle | undefined {
  const match = CONVENTIONAL_COMMIT_TITLE_PATTERN.exec(title.trim());
  if (!match) {
    return undefined;
  }
  const [, type, , scope, breakingMarker, description] = match;
  if (type === undefined || description === undefined) {
    return undefined;
  }
  return {
    type,
    scope,
    breaking: breakingMarker === "!",
    description,
  };
}
