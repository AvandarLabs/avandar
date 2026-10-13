import { describe, expect, it } from "vitest";
import { inferBumpType } from "./inferBumpType";

describe("inferBumpType", () => {
  it.each([
    ["feat: add thing", 0, "minor"],
    ["feat: add thing", 2, "minor"],
    ["fix: correct bug", 0, "patch"],
    ["fix: correct bug", 2, "patch"],
    ["chore: bump deps", 0, "patch"],
    ["refactor: simplify", 2, "patch"],
  ] as const)(
    "infers %s bump for title %s at major %i",
    (prTitle, currentMajorVersion, expectedBump) => {
      expect(
        inferBumpType({
          prTitle,
          prBody: "",
          branchName: "",
          currentMajorVersion,
        }),
      ).toBe(expectedBump);
    },
  );

  it("caps a breaking title's major bump to minor while major is 0", () => {
    const bump = inferBumpType({
      prTitle: "feat!: drop old api",
      prBody: "",
      branchName: "",
      currentMajorVersion: 0,
    });
    expect(bump).toBe("minor");
  });

  it("bumps major for a breaking title once major is at least 1", () => {
    const bump = inferBumpType({
      prTitle: "feat!: drop old api",
      prBody: "",
      branchName: "",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("major");
  });

  it("falls back to the branch prefix when the title does not parse", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "",
      branchName: "feat/get-prod-version",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("minor");
  });

  it("defaults to patch when neither the title nor the branch name parse", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "",
      branchName: "release/1.2.3",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("patch");
  });

  it("detects a breaking change from a BREAKING CHANGE footer even when the title is a fix", () => {
    const bump = inferBumpType({
      prTitle: "fix: correct bug",
      prBody: "BREAKING CHANGE: removes the old endpoint",
      branchName: "",
      currentMajorVersion: 2,
    });
    expect(bump).toBe("major");
  });

  it("caps a footer-detected breaking change to minor while major is 0, even via the branch fallback", () => {
    const bump = inferBumpType({
      prTitle: "Add get-prod-version command",
      prBody: "BREAKING CHANGE: removes the old endpoint",
      branchName: "fix/get-prod-version",
      currentMajorVersion: 0,
    });
    expect(bump).toBe("minor");
  });
});
