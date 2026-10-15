import { MAX_DIFF_CHARS_PER_COMMIT } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import { shortSha } from "@ava-cli/ReleaseCli/releaseGitHelpers";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/** Every `vX.Y.Z` tag that exists locally, oldest first. */
export function listSortedReleaseTags(git: ReleaseCommands): string[] {
  const output = git.readGit(["tag", "--list", "v*", "--sort=v:refname"]);
  return output === undefined || output.length === 0 ? [] : output.split("\n");
}

/**
 * The tag immediately before `releaseTag` in semver order.
 *
 * `releaseTag` does not need to exist yet: a `--dry-run` preview passes a tag
 * that has not been created, and the most recent existing tag is then the
 * correct previous one. When it does exist (a real release, or a historical
 * `ava release notes` lookup), the tag immediately before it in the sorted
 * list is used instead, so republishing notes for an old version still finds
 * its real predecessor rather than whatever shipped most recently.
 *
 * Returns `undefined` when there is no earlier tag at all (the first-ever
 * release).
 */
export function getPreviousReleaseTagFromTag(
  git: ReleaseCommands,
  releaseTag: string,
): string | undefined {
  const tags = listSortedReleaseTags(git);
  const index = tags.indexOf(releaseTag);
  return index === -1 ? tags.at(-1) : index === 0 ? undefined : tags[index - 1];
}

/** One commit's data as handed to the LLM that drafts release notes. */
export type ReleaseChangelogCommitInput = Readonly<{
  sha: string;
  shortSha: string;
  subject: string;
  stat: string;
  diff: string;
}>;

/** Commits `ava release` generates itself: never real release-note material. */
const HOUSEKEEPING_SUBJECT_PATTERNS = [
  /^Release: v\d+\.\d+\.\d+(?: \[skip deploy\])?$/,
  /^Bump version to \d+\.\d+\.\d+-dev(?: \[skip deploy\])?$/,
];

const LOG_FIELD_SEPARATOR = "\x1f";

/** Truncates a diff to a fixed budget so one commit can't bloat the prompt. */
function _truncateDiff(diff: string): string {
  return diff.length <= MAX_DIFF_CHARS_PER_COMMIT
    ? diff
    : `${diff.slice(0, MAX_DIFF_CHARS_PER_COMMIT)}\n… [diff truncated]`;
}

/**
 * The real, non-housekeeping commits between `previousTag` and
 * `headRevision`, each carrying enough diff context for an LLM to judge
 * whether its subject is already clear or needs rewriting.
 *
 * `--no-merges` already drops the release command's own two-parent merge
 * commit (see `createReleaseCommit` in `releaseGitHelpers.ts`); the two
 * single-parent housekeeping commits the release flow also creates are
 * filtered out explicitly by subject.
 */
export function collectReleaseChangelogCommits(
  git: ReleaseCommands,
  options: Readonly<{ previousTag: string | undefined; headRevision: string }>,
): ReleaseChangelogCommitInput[] {
  const { previousTag, headRevision } = options;
  const range =
    previousTag !== undefined
      ? `${previousTag}..${headRevision}`
      : headRevision;

  const log = git.readGit([
    "log",
    range,
    "--no-merges",
    `--format=%H${LOG_FIELD_SEPARATOR}%s`,
  ]);
  if (log === undefined || log.length === 0) {
    return [];
  }

  return log
    .split("\n")
    .map((line) => {
      const [sha, subject] = line.split(LOG_FIELD_SEPARATOR);
      return sha !== undefined && subject !== undefined
        ? { sha, subject }
        : undefined;
    })
    .filter((entry): entry is { sha: string; subject: string } => {
      return (
        entry !== undefined &&
        !HOUSEKEEPING_SUBJECT_PATTERNS.some((pattern) => {
          return pattern.test(entry.subject);
        })
      );
    })
    .map(({ sha, subject }) => {
      const stat = git.readGit(["show", "--stat", "--format=", sha]) ?? "";
      const diff = git.readGit(["show", "--format=", sha]) ?? "";
      return {
        sha,
        shortSha: shortSha(sha),
        subject,
        stat: stat.trim(),
        diff: _truncateDiff(diff.trim()),
      };
    });
}
