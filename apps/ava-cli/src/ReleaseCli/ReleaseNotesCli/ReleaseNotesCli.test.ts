import * as collectReleaseChangelogCommitsModule from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import * as publishReleaseNotesModule from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { ReleaseNotesCli } from "@ava-cli/ReleaseCli/ReleaseNotesCli/ReleaseNotesCli";
import * as releasePromptHelpersModule from "@ava-cli/ReleaseCli/releasePromptHelpers";
import * as findRepoRootModule from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes",
);
vi.mock("@ava-cli/utils/findRepoRoot");
vi.mock(
  "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits",
);
vi.mock("@ava-cli/ReleaseCli/releasePromptHelpers");

/** Run `ava release notes --dry-run` with no `--version`, as typed. */
async function _runWithoutVersion(
  options: Readonly<{ alpha: boolean }>,
): Promise<void> {
  await ReleaseNotesCli.state.action?.({
    // Acclimate types every declared option as present, but hands the action
    // `undefined` for an omitted `--version`, which is the case under test.
    version: undefined as unknown as string,
    alpha: options.alpha,
    dryRun: true,
    update: false,
  });
}

/** Both lines' tags, sorted the way `git tag --sort=v:refname` sorts them. */
const MIXED_RELEASE_TAGS = [
  "v0.14.1",
  "v0.14.2",
  "v0.15.0-alpha",
  "v0.15.1-alpha",
];

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

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("ava release notes");
    expect(process.exitCode).toBeUndefined();
  });

  it("fails outside the repository", async () => {
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue(undefined);

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("repository");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid version before calling publishReleaseNotes", async () => {
    await ReleaseNotesCli.state.action?.({
      version: "v0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

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

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain(
      "https://github.com/org/repo/releases/tag/v0.13.3",
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("passes update and dry-run through to the publisher", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "preview",
    });
    await ReleaseNotesCli.state.action?.({
      version: "0.13.4",
      alpha: false,
      dryRun: true,
      update: true,
    });
    expect(publishReleaseNotesModule.publishReleaseNotes).toHaveBeenCalledWith(
      expect.anything(),
      { releaseTag: "v0.13.4", dryRun: true, update: true },
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("targets the -alpha tag for an alpha release", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "preview",
    });
    await ReleaseNotesCli.state.action?.({
      version: "0.15.0",
      alpha: true,
      dryRun: true,
      update: false,
    });
    expect(publishReleaseNotesModule.publishReleaseNotes).toHaveBeenCalledWith(
      expect.anything(),
      { releaseTag: "v0.15.0-alpha", dryRun: true, update: false },
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("errors when release notes already exist", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "already-exists",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("already exist");
    expect(process.exitCode).toBe(1);
  });

  it("errors when the tag can't be found", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "tag-not-found",
    });

    await ReleaseNotesCli.state.action?.({
      version: "9.9.9",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("No release tag");
    expect(process.exitCode).toBe(1);
  });

  it("prints an informational message for no-changes without exiting non-zero", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "no-changes",
    });

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("nothing to publish");
    expect(process.exitCode).toBeUndefined();
  });

  it("errors when publishing fails", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "failed",
      reason: "network error",
    });

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("network error");
    expect(process.exitCode).toBe(1);
  });

  it("prints the preview on a dry run without exiting non-zero", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "- Did a thing",
    });

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      alpha: false,
      dryRun: true,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("Did a thing");
    expect(process.exitCode).toBeUndefined();
  });

  describe("without --version", () => {
    beforeEach(() => {
      vi.mocked(
        collectReleaseChangelogCommitsModule.listSortedReleaseTags,
      ).mockReturnValue(MIXED_RELEASE_TAGS);
      vi.mocked(releasePromptHelpersModule.promptForVersion).mockImplementation(
        async (options) => {
          return options.defaultValue ?? "";
        },
      );
      vi.mocked(
        publishReleaseNotesModule.publishReleaseNotes,
      ).mockResolvedValue({ kind: "previewed", notes: "preview" });
    });

    it("suggests the newest mainline version, skipping newer alpha tags", async () => {
      await _runWithoutVersion({ alpha: false });

      expect(releasePromptHelpersModule.promptForVersion).toHaveBeenCalledWith(
        expect.objectContaining({ defaultValue: "0.14.2" }),
      );
    });

    it("suggests the newest alpha version without its suffix with --alpha", async () => {
      await _runWithoutVersion({ alpha: true });

      expect(releasePromptHelpersModule.promptForVersion).toHaveBeenCalledWith(
        expect.objectContaining({ defaultValue: "0.15.1" }),
      );
    });

    it("publishes the newest alpha tag when the alpha suggestion is accepted", async () => {
      await _runWithoutVersion({ alpha: true });

      expect(
        publishReleaseNotesModule.publishReleaseNotes,
      ).toHaveBeenCalledWith(expect.anything(), {
        releaseTag: "v0.15.1-alpha",
        dryRun: true,
        update: false,
      });
      expect(process.exitCode).toBeUndefined();
    });

    it("offers no suggestion when the line has no tags yet", async () => {
      vi.mocked(
        collectReleaseChangelogCommitsModule.listSortedReleaseTags,
      ).mockReturnValue(["v0.14.1", "v0.14.2"]);

      await _runWithoutVersion({ alpha: true });

      expect(releasePromptHelpersModule.promptForVersion).toHaveBeenCalledWith(
        expect.objectContaining({ defaultValue: undefined }),
      );
    });
  });
});
