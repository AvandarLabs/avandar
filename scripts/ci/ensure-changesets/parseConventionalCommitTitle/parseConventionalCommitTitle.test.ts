import { describe, expect, it } from "vitest";
import { parseConventionalCommitTitle } from "./parseConventionalCommitTitle";

describe("parseConventionalCommitTitle", () => {
  it("parses a type and description with no scope", () => {
    expect(parseConventionalCommitTitle("feat: add foo")).toEqual({
      type: "feat",
      scope: null,
      breaking: false,
      description: "add foo",
    });
  });

  it("parses a scope in parentheses", () => {
    expect(parseConventionalCommitTitle("fix(ui): correct bug")).toEqual({
      type: "fix",
      scope: "ui",
      breaking: false,
      description: "correct bug",
    });
  });

  it("marks a title with a trailing ! as breaking", () => {
    expect(parseConventionalCommitTitle("feat!: drop old api")).toEqual({
      type: "feat",
      scope: null,
      breaking: true,
      description: "drop old api",
    });
  });

  it("marks a scoped title with a trailing ! as breaking", () => {
    expect(parseConventionalCommitTitle("feat(core)!: drop old api")).toEqual(
      {
        type: "feat",
        scope: "core",
        breaking: true,
        description: "drop old api",
      },
    );
  });

  it("returns null for a title with no Conventional Commit type", () => {
    expect(
      parseConventionalCommitTitle("Added get-prod-version command"),
    ).toBeNull();
  });

  it("returns null for a type with no description", () => {
    expect(parseConventionalCommitTitle("chore:")).toBeNull();
  });
});
