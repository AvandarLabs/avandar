/**
 * Derives the default temporary project id from a Git branch name.
 */
import { makeTemporaryProjectIdFromBranch } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/makeTemporaryProjectIdFromBranch/makeTemporaryProjectIdFromBranch";
import { describe, expect, it } from "vitest";

describe("makeTemporaryProjectIdFromBranch", () => {
  it("kebabs a slash-separated Gitflow branch", () => {
    expect(makeTemporaryProjectIdFromBranch("feat/analytics-p2")).toBe(
      "feat-analytics-p2",
    );
  });

  it("keeps underscores and lowercases", () => {
    expect(makeTemporaryProjectIdFromBranch("Feat/Analytics_P2")).toBe(
      "feat-analytics_p2",
    );
  });

  it("collapses runs of invalid characters and trims hyphens", () => {
    expect(makeTemporaryProjectIdFromBranch("--feat//nux--")).toBe("feat-nux");
  });

  it("rejects a branch that collapses to an empty project id", () => {
    expect(() => {
      makeTemporaryProjectIdFromBranch("///");
    }).toThrow('Could not derive a temporary project id from branch "///"');
  });
});
