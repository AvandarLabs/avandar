import { renderReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes/renderReleaseNotes";
import { describe, expect, it } from "vitest";
import type { ReleaseNoteBullet } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes/renderReleaseNotes";

function _bullet(overrides: Partial<ReleaseNoteBullet>): ReleaseNoteBullet {
  return {
    group: "Features",
    text: "Did a thing",
    commits: ["abc1234"],
    ...overrides,
  };
}

describe("renderReleaseNotes", () => {
  it("returns an empty string for no bullets", () => {
    expect(renderReleaseNotes([])).toBe("");
  });

  it("flattens when every group has only one bullet", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
      _bullet({ group: "Chores", text: "Chore A" }),
    ];
    expect(renderReleaseNotes(bullets)).toBe("- Feature A\n- Fix A\n- Chore A");
  });

  it("flattens when only one group has 2+ bullets", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Features", text: "Feature B" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
    ];
    expect(renderReleaseNotes(bullets)).toBe(
      "- Feature A\n- Feature B\n- Fix A",
    );
  });

  it("sections by group when at least 2 groups have 2+ bullets each", () => {
    const bullets = [
      _bullet({ group: "Features", text: "Feature A" }),
      _bullet({ group: "Fixes", text: "Fix A" }),
      _bullet({ group: "Fixes", text: "Fix B" }),
      _bullet({
        group: "Nits",
        text: "Numerous typo fixes",
        commits: ["a1", "b2"],
      }),
      _bullet({ group: "Nits", text: "More formatting", commits: ["c3"] }),
    ];
    expect(renderReleaseNotes(bullets)).toBe(
      [
        "## Features",
        "- Feature A",
        "",
        "## Fixes",
        "- Fix A",
        "- Fix B",
        "",
        "## Nits",
        "- Numerous typo fixes (`a1`, `b2`)",
        "- More formatting",
      ].join("\n"),
    );
  });

  it("appends every commit hash in backticks only when a bullet bundles more than one commit", () => {
    expect(renderReleaseNotes([_bullet({ commits: ["abc1234"] })])).toBe(
      "- Did a thing",
    );
    expect(
      renderReleaseNotes([_bullet({ commits: ["abc1234", "def5678"] })]),
    ).toBe("- Did a thing (`abc1234`, `def5678`)");
  });
});
