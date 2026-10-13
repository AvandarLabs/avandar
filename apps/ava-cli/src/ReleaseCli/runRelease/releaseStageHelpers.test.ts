import { reportReleaseNotesOutcome } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("reportReleaseNotesOutcome", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  function _loggedText(): string {
    return logSpy.mock.calls
      .map((call) => {
        return call
          .map((arg) => {
            return typeof arg === "string" ? arg : JSON.stringify(arg);
          })
          .join(" ");
      })
      .join("\n");
  }

  it("prints nothing when notes were published", () => {
    reportReleaseNotesOutcome(
      { kind: "published", url: "https://github.com/x/y/releases/tag/v1.0.0" },
      "1.0.0",
      false,
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("prints the preview notes on a dry run without a retry hint", () => {
    reportReleaseNotesOutcome(
      { kind: "previewed", notes: "- Did a thing" },
      "1.0.0",
      false,
    );
    expect(_loggedText()).toContain("Did a thing");
    expect(_loggedText()).not.toContain("ava release notes");
  });

  it("prints an informational line for no-changes", () => {
    reportReleaseNotesOutcome({ kind: "no-changes" }, "1.0.0", false);
    expect(_loggedText()).toContain("No commits found");
  });

  it("warns and prints the retry command when publishing failed", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      "1.0.0",
      false,
    );
    expect(_loggedText()).toContain("network error");
    expect(_loggedText()).toContain("ava release notes --version 1.0.0");
  });

  it("warns when a release already exists, without a retry hint", () => {
    reportReleaseNotesOutcome(
      {
        kind: "already-exists",
        url: "https://github.com/x/y/releases/tag/v1.0.0",
      },
      "1.0.0",
      false,
    );
    expect(_loggedText()).toContain("already exist");
    expect(_loggedText()).not.toContain("ava release notes");
  });

  it("warns and prints the retry command when the tag can't be found", () => {
    reportReleaseNotesOutcome({ kind: "tag-not-found" }, "1.0.0", false);
    expect(_loggedText()).toContain("ava release notes --version 1.0.0");
  });

  it("suppresses the retry hint for a failed outcome on a dry run", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      "1.0.0",
      true,
    );
    expect(_loggedText()).toContain("network error");
    expect(_loggedText()).not.toContain("ava release notes");
  });

  it("suppresses the retry hint for tag-not-found on a dry run", () => {
    reportReleaseNotesOutcome({ kind: "tag-not-found" }, "1.0.0", true);
    expect(_loggedText()).not.toContain("ava release notes");
  });
});
