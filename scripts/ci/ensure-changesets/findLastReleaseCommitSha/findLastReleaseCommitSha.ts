/**
 * Subject prefix of the commit that lands when the version PR merges. It
 * matches both the `title` and `commit` that `release-packages.yaml` passes
 * to `changesets/action`, so it holds for squash and rebase merges alike.
 */
const RELEASE_COMMIT_SUBJECT_PREFIX = "Release: @avandar packages";

export type CommitSummary = {
  sha: string;
  subject: string;
};

/**
 * Finds the newest version-PR commit in a newest-first commit list. Every
 * changeset written before it has already been consumed by
 * `changeset version`. Returns undefined when no release has landed yet.
 */
export function findLastReleaseCommitSha(
  commits: readonly CommitSummary[],
): string | undefined {
  return commits.find((commit) => {
    return commit.subject.startsWith(RELEASE_COMMIT_SUBJECT_PREFIX);
  })?.sha;
}
