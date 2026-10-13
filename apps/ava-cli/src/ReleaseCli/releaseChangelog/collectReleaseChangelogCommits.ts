import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/**
 * Resolves which commits belong in a release's generated notes: the real
 * (non-housekeeping) commits between the previous version tag and this
 * release.
 */

/** Every `vX.Y.Z` tag that exists locally, oldest first. */
export function listSortedReleaseTags(git: ReleaseCommands): string[] {
  const output = git.readGit(["tag", "--list", "v*", "--sort=v:refname"]);
  return output === undefined || output.length === 0
    ? []
    : output.split("\n");
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
export function resolvePreviousReleaseTag(
  git: ReleaseCommands,
  releaseTag: string,
): string | undefined {
  const tags = listSortedReleaseTags(git);
  const index = tags.indexOf(releaseTag);
  if (index === -1) {
    return tags.at(-1);
  }
  return index === 0 ? undefined : tags[index - 1];
}
