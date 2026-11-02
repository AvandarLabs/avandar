import { describe, expect, it, vi } from "vitest";
import { makeReleaseCreditsFromCommits } from "./makeReleaseCreditsFromCommits";
import type { ReleaseCommands } from "../../createReleaseCommands";
import type { ReleaseChangelogCommitInput } from "../collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import type {
  ReleaseActor,
  ReleaseCommitMetadataInput,
} from "./makeReleaseCreditsFromCommits";

const HUMAN: ReleaseActor = { login: "jpsyx", __typename: "User" };
const BOT: ReleaseActor = { login: "claude", __typename: "Bot" };
const COMMIT: ReleaseChangelogCommitInput = {
  sha: "abc1234full",
  shortSha: "abc1234",
  subject: "Feature",
  stat: "",
  diff: "",
};

function _createMetadata(
  options: Readonly<{
    author?: ReleaseActor;
    reviewer?: ReleaseActor;
    merger?: ReleaseActor;
  }> = {},
): ReleaseCommitMetadataInput {
  const { author = HUMAN, reviewer = HUMAN, merger = HUMAN } = options;
  return {
    authors: {
      nodes: [
        { name: "Human", user: HUMAN },
        { name: "Claude", user: BOT },
      ],
      pageInfo: { hasNextPage: false },
    },
    associatedPullRequests: {
      nodes: [
        {
          number: 12,
          merged: true,
          mergeCommit: { oid: COMMIT.sha },
          author,
          mergedBy: merger,
          reviews: {
            nodes: [{ author: reviewer, state: "APPROVED" }],
            pageInfo: { hasNextPage: false },
          },
        },
      ],
      pageInfo: { hasNextPage: false },
    },
  };
}

function _createGit(metadata: unknown): ReleaseCommands {
  return {
    repoRoot: "/fake/repo",
    dryRun: false,
    readCommand: vi.fn().mockReturnValue({
      ok: true,
      stdout: JSON.stringify({ data: { repository: { object: metadata } } }),
      stderr: "",
    }),
    readGit: vi.fn(),
    tryGit: vi.fn(),
    mutate: vi.fn(),
    mutateQuietly: vi.fn(),
  };
}

describe("makeReleaseCreditsFromCommits", () => {
  it("credits only the human PR submitter despite AI coauthors", () => {
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(_createMetadata()),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234"),
    ).toEqual({
      url: "https://github.com/org/repo/commit/abc1234full",
      credit: "by @jpsyx",
    });
  });
  it("omits other human reviewers and mergers for a human submitter", () => {
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(
          _createMetadata({
            reviewer: { login: "reviewer", __typename: "User" },
            merger: { login: "maintainer", __typename: "User" },
          }),
        ),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234")?.credit,
    ).toBe("by @jpsyx");
  });
  it("credits an AI submitter and combines human review and merge credits", () => {
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(_createMetadata({ author: BOT })),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234")?.credit,
    ).toBe("by @claude, reviewed and merged by @jpsyx");
  });
  it("omits bot review and merge credits", () => {
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(
          _createMetadata({ author: BOT, reviewer: BOT, merger: BOT }),
        ),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234")?.credit,
    ).toBe("by @claude");
  });
  it("separates different human reviewers and mergers", () => {
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(
          _createMetadata({
            author: BOT,
            merger: { login: "maintainer", __typename: "User" },
          }),
        ),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234")?.credit,
    ).toBe("by @claude, reviewed by @jpsyx, merged by @maintainer");
  });
  it("credits only human authors on direct commits", () => {
    const metadata = _createMetadata();
    metadata.associatedPullRequests.nodes = [];
    expect(
      makeReleaseCreditsFromCommits({
        git: _createGit(metadata),
        repoSlug: "org/repo",
        commits: [COMMIT],
      }).get("abc1234")?.credit,
    ).toBe("by @jpsyx");
  });
  it("refuses incomplete metadata", () => {
    const metadata = _createMetadata();
    const incompleteMetadata = {
      ...metadata,
      associatedPullRequests: {
        ...metadata.associatedPullRequests,
        pageInfo: { hasNextPage: true },
      },
    };
    expect(() => {
      return makeReleaseCreditsFromCommits({
        git: _createGit(incompleteMetadata),
        repoSlug: "org/repo",
        commits: [COMMIT],
      });
    }).toThrow();
  });
});
