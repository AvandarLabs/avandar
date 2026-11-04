import { describe, expect, it } from "vitest";
import { findLastReleaseCommitSha } from "./findLastReleaseCommitSha";

describe("findLastReleaseCommitSha", () => {
  it("returns the newest squash-merged version PR", () => {
    expect(
      findLastReleaseCommitSha([
        { sha: "c3", subject: "refactor: stable column ids (#304)" },
        { sha: "c2", subject: "Release: @avandar packages (#266)" },
        { sha: "c1", subject: "Release: @avandar packages (#264)" },
      ]),
    ).toBe("c2");
  });

  it("matches the version commit when it lands without a PR suffix", () => {
    expect(
      findLastReleaseCommitSha([
        { sha: "c2", subject: "Release: @avandar packages [skip deploy]" },
        { sha: "c1", subject: "feat: something" },
      ]),
    ).toBe("c2");
  });

  it("ignores app releases, which use a different prefix", () => {
    expect(
      findLastReleaseCommitSha([
        { sha: "c2", subject: "Release: v0.13.5 [skip deploy]" },
        { sha: "c1", subject: "Release: @avandar packages (#266)" },
      ]),
    ).toBe("c1");
  });

  it("does not match the prefix in the middle of a subject", () => {
    expect(
      findLastReleaseCommitSha([
        { sha: "c1", subject: "Revert \"Release: @avandar packages (#266)\"" },
      ]),
    ).toBeUndefined();
  });

  it("returns undefined when there has never been a release", () => {
    expect(findLastReleaseCommitSha([])).toBeUndefined();
  });
});
