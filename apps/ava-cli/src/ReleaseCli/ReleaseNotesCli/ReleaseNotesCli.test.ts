import * as publishReleaseNotesModule from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { ReleaseNotesCli } from "@ava-cli/ReleaseCli/ReleaseNotesCli/ReleaseNotesCli";
import * as findRepoRootModule from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes",
);
vi.mock("@ava-cli/utils/findRepoRoot");

function _loggedText(logSpy: ReturnType<typeof vi.spyOn>): string {
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

describe("ava release notes", () => {
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.argv = [process.execPath, "ava", "release", "notes"];
    process.exitCode = undefined;
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue("/fake/repo");
    logSpy = vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it("prints help without needing a repository", async () => {
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue(undefined);
    process.argv.push("--help");

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("ava release notes");
    expect(process.exitCode).toBeUndefined();
  });

  it("fails outside the repository", async () => {
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue(undefined);

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("repository");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid version before calling publishReleaseNotes", async () => {
    await ReleaseNotesCli.state.action?.({ version: "v0.13.3", dryRun: false });

    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).not.toHaveBeenCalled();
    expect(_loggedText(logSpy)).toContain("must not start");
    expect(process.exitCode).toBe(1);
  });

  it("publishes and prints success", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "published",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain(
      "https://github.com/org/repo/releases/tag/v0.13.3",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("errors when release notes already exist", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "already-exists",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("already exist");
    expect(process.exitCode).toBe(1);
  });

  it("errors when the tag can't be found", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "tag-not-found",
    });

    await ReleaseNotesCli.state.action?.({ version: "9.9.9", dryRun: false });

    expect(_loggedText(logSpy)).toContain("No release tag");
    expect(process.exitCode).toBe(1);
  });

  it("prints an informational message for no-changes without exiting non-zero", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "no-changes",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("nothing to publish");
    expect(process.exitCode).toBeUndefined();
  });

  it("errors when publishing fails", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "failed",
      reason: "network error",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: false });

    expect(_loggedText(logSpy)).toContain("network error");
    expect(process.exitCode).toBe(1);
  });

  it("prints the preview on a dry run without exiting non-zero", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "- Did a thing",
    });

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", dryRun: true });

    expect(_loggedText(logSpy)).toContain("Did a thing");
    expect(process.exitCode).toBeUndefined();
  });
});
