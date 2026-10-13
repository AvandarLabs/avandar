import {
  collectReleaseChangelogCommits,
  listSortedReleaseTags,
  getPreviousReleaseTagFromTag,
} from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import { MAX_DIFF_CHARS_PER_COMMIT } from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
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

describe("getPreviousReleaseTagFromTag", () => {
  it("returns the tag right before an existing release tag", () => {
    const git = _createFakeGit({
      [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1\nv0.13.0",
    });
    expect(getPreviousReleaseTagFromTag(git, "v0.12.1")).toBe("v0.12.0");
  });

  it("returns undefined for the oldest known tag", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(getPreviousReleaseTagFromTag(git, "v0.12.0")).toBeUndefined();
  });

  it("falls back to the most recent existing tag when the target doesn't exist yet", () => {
    // This is the --dry-run preview case: the new tag has not been created.
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "v0.12.0\nv0.12.1" });
    expect(getPreviousReleaseTagFromTag(git, "v0.13.0")).toBe("v0.12.1");
  });

  it("returns undefined when there are no tags at all", () => {
    const git = _createFakeGit({ [TAG_LIST_ARGS]: "" });
    expect(getPreviousReleaseTagFromTag(git, "v0.1.0")).toBeUndefined();
  });
});

const SEP = "\x1f";

describe("collectReleaseChangelogCommits", () => {
  it("drops housekeeping commits and keeps real ones with their stat and diff", () => {
    const log = [
      `aaa1111${SEP}Release: v0.13.3 [skip deploy]`,
      `bbb2222${SEP}Added get-prod-version command to ava CLI (#296)`,
      `ccc3333${SEP}Bump version to 0.13.3-dev [skip deploy]`,
    ].join("\n");

    const git = _createFakeGit({
      "log v0.13.2..v0.13.3 --no-merges --format=%H\x1f%s": log,
      "show --stat --format= bbb2222": " 1 file changed, 2 insertions(+)",
      "show --format= bbb2222": "diff --git a/foo b/foo\n+line",
    });

    const commits = collectReleaseChangelogCommits(git, {
      previousTag: "v0.13.2",
      headRevision: "v0.13.3",
    });

    expect(commits).toEqual([
      {
        sha: "bbb2222",
        shortSha: "bbb2222",
        subject: "Added get-prod-version command to ava CLI (#296)",
        stat: "1 file changed, 2 insertions(+)",
        diff: "diff --git a/foo b/foo\n+line",
      },
    ]);
  });

  it("truncates a diff larger than the configured budget", () => {
    const hugeDiff = "x".repeat(MAX_DIFF_CHARS_PER_COMMIT + 500);
    const git = _createFakeGit({
      "log v0.1.0..v0.2.0 --no-merges --format=%H\x1f%s": `sha1${SEP}A real change`,
      "show --stat --format= sha1": "1 file changed",
      "show --format= sha1": hugeDiff,
    });

    const [commit] = collectReleaseChangelogCommits(git, {
      previousTag: "v0.1.0",
      headRevision: "v0.2.0",
    });

    expect(commit?.diff.length).toBeLessThan(hugeDiff.length);
    expect(commit?.diff).toContain("[diff truncated]");
  });

  it("uses the head revision alone as the range when there is no previous tag", () => {
    const git = _createFakeGit({
      "log v0.1.0 --no-merges --format=%H\x1f%s": `sha1${SEP}First change`,
      "show --stat --format= sha1": "1 file changed",
      "show --format= sha1": "diff",
    });

    const commits = collectReleaseChangelogCommits(git, {
      previousTag: undefined,
      headRevision: "v0.1.0",
    });

    expect(commits).toHaveLength(1);
  });

  it("returns an empty array when the range has no commits", () => {
    const git = _createFakeGit({
      "log v0.1.0..v0.1.1 --no-merges --format=%H\x1f%s": "",
    });

    expect(
      collectReleaseChangelogCommits(git, {
        previousTag: "v0.1.0",
        headRevision: "v0.1.1",
      }),
    ).toEqual([]);
  });
});
