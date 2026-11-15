const CONVENTIONAL_COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "chore",
  "docs",
  "test",
] as const;

export type ConventionalCommitType = (typeof CONVENTIONAL_COMMIT_TYPES)[number];

/**
 * Extracts this repo's Gitflow type prefix from a branch name, e.g.
 * "feat/thing" -> "feat". Returns undefined when the branch has no
 * recognized prefix.
 */
export function getCommitTypeFromBranchName(
  branchName: string,
): ConventionalCommitType | undefined {
  const [prefix = ""] = branchName.split("/");
  return (CONVENTIONAL_COMMIT_TYPES as readonly string[]).includes(prefix)
    ? (prefix as ConventionalCommitType)
    : undefined;
}
