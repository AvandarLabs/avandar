export type ConventionalCommitTitle = {
  type: string;
  scope: string | null;
  breaking: boolean;
  description: string;
};

const CONVENTIONAL_COMMIT_TITLE_PATTERN =
  /^([a-z]+)(\(([^)]+)\))?(!)?:\s+(.+)$/;

/**
 * Parses a PR title as a Conventional Commit header
 * (`type(scope)!: description`), or returns null when it does not match.
 */
export function parseConventionalCommitTitle(
  title: string,
): ConventionalCommitTitle | null {
  const match = CONVENTIONAL_COMMIT_TITLE_PATTERN.exec(title.trim());
  if (!match) {
    return null;
  }
  const [, type, , scope, breakingMarker, description] = match;
  if (type === undefined || description === undefined) {
    return null;
  }
  return {
    type,
    scope: scope ?? null,
    breaking: breakingMarker === "!",
    description,
  };
}
