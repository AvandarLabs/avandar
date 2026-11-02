import { describe, expect, it } from "vitest";
import { getCommitTypeFromBranchName } from "./getCommitTypeFromBranchName";

describe("getCommitTypeFromBranchName", () => {
  it.each([
    ["feat/auto-changesets", "feat"],
    ["fix/thing", "fix"],
    ["refactor/cleanup", "refactor"],
    ["chore/bump-deps", "chore"],
    ["docs/readme", "docs"],
    ["test/add-coverage", "test"],
  ])("extracts %s as %s", (branchName, expectedType) => {
    expect(getCommitTypeFromBranchName(branchName)).toBe(expectedType);
  });

  it("returns undefined for a branch with no recognized type prefix", () => {
    expect(getCommitTypeFromBranchName("release/1.2.3")).toBeUndefined();
  });

  it("returns undefined for a branch name with no slash", () => {
    expect(getCommitTypeFromBranchName("develop")).toBeUndefined();
  });
});
