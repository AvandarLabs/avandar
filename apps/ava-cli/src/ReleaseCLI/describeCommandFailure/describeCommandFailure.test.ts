import { describeCommandFailure } from "@ava-cli/ReleaseCLI/describeCommandFailure/describeCommandFailure";
import { describe, expect, it } from "vitest";

const FALLBACK = "the gh CLI could not answer";

describe("describeCommandFailure", () => {
  it("uses the first line of stderr", () => {
    const description = describeCommandFailure(
      { ok: false, stdout: "", stderr: "gh: not logged in" },
      FALLBACK,
    );

    expect(description).toBe("gh: not logged in");
  });

  it("drops everything after the first line", () => {
    // `gh` and `git` both print a hint block under the real error, which would
    // otherwise turn a one-line refusal into a wall of text.
    const description = describeCommandFailure(
      {
        ok: false,
        stdout: "",
        stderr: "gh: not logged in\nTry: gh auth login\nSee also: gh help",
      },
      FALLBACK,
    );

    expect(description).toBe("gh: not logged in");
  });

  it("falls back when the command failed without printing anything", () => {
    // Reachable in practice: a process killed by a signal, or one that wrote
    // its diagnosis to stdout instead.
    expect(
      describeCommandFailure({ ok: false, stdout: "", stderr: "" }, FALLBACK),
    ).toBe(FALLBACK);
  });

  it("falls back when the first line is empty", () => {
    // A leading newline must not produce a message ending in ": .".
    expect(
      describeCommandFailure(
        { ok: false, stdout: "", stderr: "\nsomething went wrong" },
        FALLBACK,
      ),
    ).toBe(FALLBACK);
  });
});
