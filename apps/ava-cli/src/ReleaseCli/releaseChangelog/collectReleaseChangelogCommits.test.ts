import {
  listSortedReleaseTags,
  resolvePreviousReleaseTag,
} from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits";
import { describe, expect, it } from "vitest";
import type { ReleaseCommands } from "@ava-cli/ReleaseCli/createReleaseCommands";

/** A fake `ReleaseCommands` whose `readGit` answers from a fixed script. */
function _createFakeGit(
  readGitByArgs: Record<string, string | undefined>,
): ReleaseCommands {
  return {
    repoRoot: "/fake/repo",
    dryRun: false,
    readGit: (args) => {
      return readGitByArgs[args.join(" ")];
    },
    tryGit: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    readCommand: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    mutate: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
    mutateQuietly: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
  };
}

const TAG_LIST_ARGS = "tag --list v* --sort=v:refname";

describe("listSortedReleaseTags", () => {
  it("splits the sorted tag list into an array", () => {
    const git = _createFakeGit({
      [TAG_LIST_ARGS]: "v0.1.0\nv0.2.0\nv0.10.0",
    });
    expect(listSortedReleaseTags(git)).toEqual(["v0.1.0", "v0.2.0", "v0.10.0"]);
  });

  it("returns an empty array when there are no tags", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "" });
    expect(listSortedReleaseTags(git)).toEqual([]);
  });
});

describe("resolvePreviousReleaseTag", () => {
  it("returns the tag right before an existing release tag", () => {
    const git = _createFakeGit({
      [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1\nv0.13.0",
    });
    expect(resolvePreviousReleaseTag(git, "v0.12.1")).toBe("v0.12.0");
  });

  it("returns undefined for the oldest known tag", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(resolvePreviousReleaseTag(git, "v0.12.0")).toBeUndefined();
  });

  it("falls back to the most recent existing tag when the target doesn't exist yet", () => {
    // This is the --dry-run preview case: the new tag has not been created.
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(resolvePreviousReleaseTag(git, "v0.13.0")).toBe("v0.12.1");
  });

  it("returns undefined when there are no tags at all", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "" });
    expect(resolvePreviousReleaseTag(git, "v0.1.0")).toBeUndefined();
  });
});
