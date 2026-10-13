import { describe, expect, it } from "vitest";
import { branchNameToCommitType } from "./branchNameToCommitType";

describe("branchNameToCommitType", () => {
  it.each([
    ["feat/auto-changesets", "feat"],
    ["fix/thing", "fix"],
    ["refactor/cleanup", "refactor"],
    ["chore/bump-deps", "chore"],
    ["docs/readme", "docs"],
    ["test/add-coverage", "test"],
  ])("extracts %s as %s", (branchName, expectedType) => {
    expect(branchNameToCommitType(branchName)).toBe(expectedType);
  });

  it("returns null for a branch with no recognized type prefix", () => {
    expect(branchNameToCommitType("release/1.2.3")).toBeNull();
  });

  it("returns null for a branch name with no slash", () => {
    expect(branchNameToCommitType("develop")).toBeNull();
  });
});
