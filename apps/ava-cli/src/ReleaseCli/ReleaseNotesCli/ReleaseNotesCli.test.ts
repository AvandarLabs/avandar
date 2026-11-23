import { DEFAULT_ENV_NAME } from "@ava-cli/AvaEnv/AvaEnv";
import * as collectReleaseChangelogCommitsModule from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import * as publishReleaseNotesModule from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
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
async function _runWithoutVersion(): Promise<void> {
  await ReleaseNotesCli.state.action?.({
    // Acclimate types every declared option as present, but hands the action
    // `undefined` for an omitted `--version`, which is the case under test.
    version: undefined as unknown as string,
    dryRun: true,
    update: false,
  });
}

/**
 * Release tags as `git tag --sort=v:refname` sorts them, including suffixed
 * tags from a retired release line that are not releases.
 */
const MIXED_RELEASE_TAGS = [
  "v0.14.1",
  "v0.14.2",
  "v0.15.0-alpha",
  "v0.15.1-alpha",
];

/** The boolean options Acclimate parses out of one accepted-flag case. */
type ParsedReleaseNotesFlags = { dryRun: boolean; update: boolean };

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
      dryRun: false,
      update: false,
    });

    expect(_loggedText(logSpy)).toContain("repository");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid version before calling publishReleaseNotes", async () => {
    await ReleaseNotesCli.state.action?.({
      version: "v0.13.3",
      dryRun: false,
      update: false,
    });

    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).not.toHaveBeenCalled();
    expect(_loggedText(logSpy)).toContain("must not start");
    expect(process.exitCode).toBe(1);
  });

  it("refuses --alpha with exit code 1, publishing nothing", async () => {
    process.argv.push("--version", "0.15.0", "--alpha");

    await ReleaseNotesCli.state.action?.({
      version: "0.15.0",
      dryRun: false,
      update: false,
    });

    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).not.toHaveBeenCalled();
    expect(_loggedText(logSpy)).toContain("--alpha");
    expect(process.exitCode).toBe(1);
  });

  it("refuses --dry-run=true with exit code 1, publishing nothing", async () => {
    // Acclimate reads `--dry-run=true` as an unknown option named
    // `--dry-run=true`, so the action sees `dryRun: false`.
    process.argv.push("--version", "0.13.3", "--dry-run=true");

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
      dryRun: false,
      update: false,
    });

    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).not.toHaveBeenCalled();
    expect(_loggedText(logSpy)).toContain("--dry-run=true");
    expect(process.exitCode).toBe(1);
  });

  it.each<[string, readonly string[], ParsedReleaseNotesFlags]>([
    ["--version", ["--version", "0.13.3"], { dryRun: false, update: false }],
    ["-v", ["-v", "0.13.3"], { dryRun: false, update: false }],
    [
      "--update",
      ["--version", "0.13.3", "--update"],
      { dryRun: false, update: true },
    ],
    [
      "--dry-run",
      ["--version", "0.13.3", "--dry-run"],
      { dryRun: true, update: false },
    ],
    [
      "--env <value>",
      ["--version", "0.13.3", "--env", "staging"],
      { dryRun: false, update: false },
    ],
  ])("accepts %s and publishes v0.13.3", async (_flag, flags, parsedFlags) => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "published",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });
    process.argv.push(...flags);

    await ReleaseNotesCli.state.action?.({ version: "0.13.3", ...parsedFlags });

    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      releaseTag: "v0.13.3",
      ...parsedFlags,
    });
    expect(process.exitCode).toBeUndefined();
  });

  it("publishes and prints success", async () => {
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "published",
      url: "https://github.com/org/repo/releases/tag/v0.13.3",
    });

    await ReleaseNotesCli.state.action?.({
      version: "0.13.3",
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
      dryRun: true,
      update: true,
    });
    expect(publishReleaseNotesModule.publishReleaseNotes).toHaveBeenCalledWith(
      expect.anything(),
      { releaseTag: "v0.13.4", dryRun: true, update: true },
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

    it("suggests the newest release version, skipping newer suffixed tags", async () => {
      await _runWithoutVersion();

      expect(releasePromptHelpersModule.promptForVersion).toHaveBeenCalledWith(
        expect.objectContaining({ defaultValue: "0.14.2" }),
      );
    });
  });
});

/**
 * Run `ava release notes <flags>` through Acclimate's real argument parser,
 * from a root CLI cut down to what routes the command: the global `--env`
 * option `main.ts` declares and the `release` command. Acclimate does not
 * hand back a promise, so the caller waits for the outcome it expects.
 */
function _runAvaReleaseNotes(flags: readonly string[]): void {
  process.argv = [process.execPath, "ava", "release", "notes", ...flags];
  Acclimate.run(
    Acclimate.createCLI("ava")
      .addGlobalOption({
        name: "--env",
        type: "string",
        required: false,
        defaultValue: DEFAULT_ENV_NAME,
      })
      .addCommand("release", ReleaseCli),
  );
}

describe("ava release notes through the real argument parser", () => {
  let originalArgv: string[];
  let originalExitCode: typeof process.exitCode;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    vi.mocked(findRepoRootModule.findRepoRoot).mockReturnValue("/fake/repo");
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockReset();
    vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mockResolvedValue({
      kind: "previewed",
      notes: "preview",
    });
    logSpy = vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  /** Wait for the action to refuse, then prove it published nothing. */
  const _expectRefusal = async (expectedText: string): Promise<void> => {
    await vi.waitFor(() => {
      expect(process.exitCode).toBe(1);
    });
    expect(_loggedText(logSpy)).toContain(expectedText);
    expect(
      publishReleaseNotesModule.publishReleaseNotes,
    ).not.toHaveBeenCalled();
  };

  /** Wait for the action to call the publisher, and return what it passed. */
  const _waitForPublishOptions = async (): Promise<unknown> => {
    await vi.waitFor(() => {
      expect(publishReleaseNotesModule.publishReleaseNotes).toHaveBeenCalled();
    });
    return vi.mocked(publishReleaseNotesModule.publishReleaseNotes).mock
      .calls[0]?.[1];
  };

  it("parses --dry-run as dryRun: true", async () => {
    _runAvaReleaseNotes(["--version", "0.13.3", "--dry-run"]);

    expect(await _waitForPublishOptions()).toEqual({
      releaseTag: "v0.13.3",
      dryRun: true,
      update: false,
    });
  });

  it("refuses --dry-run=true with exit code 1, publishing nothing", async () => {
    _runAvaReleaseNotes(["--version", "0.13.3", "--dry-run=true"]);

    await _expectRefusal("--dry-run=true");
  });

  it("refuses --update dry-run, which would otherwise publish for real", async () => {
    _runAvaReleaseNotes(["--version", "0.13.3", "--update", "dry-run"]);

    await _expectRefusal("dry-run");
  });

  it("refuses a flag typed with a long dash after --update", async () => {
    // An em dash, as an editor's autocorrect turns a pasted `--` into.
    const token = "\u2014dry-run";
    _runAvaReleaseNotes(["--version", "0.13.3", "--update", token]);

    await _expectRefusal(token);
  });

  it("accepts --version 0.15.0", async () => {
    _runAvaReleaseNotes(["--version", "0.15.0"]);

    expect(await _waitForPublishOptions()).toEqual({
      releaseTag: "v0.15.0",
      dryRun: false,
      update: false,
    });
  });

  it("accepts the global --env staging", async () => {
    _runAvaReleaseNotes(["--version", "0.13.3", "--env", "staging"]);

    expect(await _waitForPublishOptions()).toEqual({
      releaseTag: "v0.13.3",
      dryRun: false,
      update: false,
    });
    expect(process.exitCode).toBeUndefined();
  });
});
