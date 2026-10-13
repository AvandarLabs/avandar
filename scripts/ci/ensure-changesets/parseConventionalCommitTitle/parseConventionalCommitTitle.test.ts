import { describe, expect, it } from "vitest";
import { parseConventionalCommitTitle } from "./parseConventionalCommitTitle";

describe("parseConventionalCommitTitle", () => {
  it("returns an undefined scope with the parsed type and description when the title has no scope", () => {
    expect(parseConventionalCommitTitle("feat: add foo")).toEqual({
      type: "feat",
      scope: undefined,
      breaking: false,
      description: "add foo",
    });
  });

  it("extracts the parenthesized segment into the scope field", () => {
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
      scope: undefined,
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

  it("returns undefined for a title with no Conventional Commit type", () => {
    expect(
      parseConventionalCommitTitle("Added get-prod-version command"),
    ).toBeUndefined();
  });

  it("returns undefined for a type with no description", () => {
    expect(parseConventionalCommitTitle("chore:")).toBeUndefined();
  });
});
