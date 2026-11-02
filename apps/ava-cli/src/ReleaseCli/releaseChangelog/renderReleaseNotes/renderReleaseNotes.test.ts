import { describe, expect, it } from "vitest";
import { renderReleaseNotes } from "./renderReleaseNotes";
import type { ReleaseCredit } from "../makeReleaseCreditsFromCommits/makeReleaseCreditsFromCommits";
import type { ReleaseNoteBullet } from "./renderReleaseNotes";

const CREDITS: Map<string, ReleaseCredit> = new Map([
  [
    "abc1234",
    {
      url: "https://github.com/org/repo/commit/abc1234full",
      credit: "by @jpsyx",
    },
  ],
  [
    "def5678",
    {
      url: "https://github.com/org/repo/commit/def5678full",
      credit: "by @claude, reviewed and merged by @jpsyx",
    },
  ],
]);
const BULLET: ReleaseNoteBullet = {
  group: "Features",
  text: "Feature A",
  commits: ["abc1234"],
};
describe("renderReleaseNotes", () => {
  it("links and credits a single commit", () => {
    expect(renderReleaseNotes({ bullets: [BULLET], credits: CREDITS })).toBe(
      "- Feature A ([`abc1234`](https://github.com/org/repo/commit/abc1234full) by @jpsyx)",
    );
  });
  it("keeps credits associated with each bundled commit", () => {
    expect(
      renderReleaseNotes({
        bullets: [{ ...BULLET, commits: ["abc1234", "def5678"] }],
        credits: CREDITS,
      }),
    ).toBe(
      "- Feature A ([`abc1234`](https://github.com/org/repo/commit/abc1234full) by @jpsyx; [`def5678`](https://github.com/org/repo/commit/def5678full) by @claude, reviewed and merged by @jpsyx)",
    );
  });
  it("rejects invented commit IDs", () => {
    expect(() => {
      return renderReleaseNotes({
        bullets: [{ ...BULLET, commits: ["invented"] }],
        credits: CREDITS,
      });
    }).toThrow("Unknown release commit");
  });
  it("rejects a bullet without source commits", () => {
    expect(() => {
      return renderReleaseNotes({
        bullets: [{ ...BULLET, commits: [] }],
        credits: CREDITS,
      });
    }).toThrow("no commits");
  });
  it("returns empty text for no bullets", () => {
    expect(renderReleaseNotes({ bullets: [], credits: CREDITS })).toBe("");
  });
  it("uses sections only when two groups have multiple bullets", () => {
    const feature = { ...BULLET, text: "Feature B" };
    const fix = { ...BULLET, group: "Fixes", text: "Fix A" };
    expect(
      renderReleaseNotes({ bullets: [BULLET, feature, fix], credits: CREDITS }),
    ).not.toContain("##");
    expect(
      renderReleaseNotes({
        bullets: [BULLET, feature, fix, { ...fix, text: "Fix B" }],
        credits: CREDITS,
      }),
    ).toContain("## Features\n");
    expect(
      renderReleaseNotes({
        bullets: [BULLET, feature, fix, { ...fix, text: "Fix B" }],
        credits: CREDITS,
      }),
    ).toContain("## Fixes\n");
  });
});
