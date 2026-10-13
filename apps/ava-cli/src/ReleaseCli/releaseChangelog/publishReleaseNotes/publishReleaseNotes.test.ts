import { publishReleaseNotes } from "@ava-cli/ReleaseCli/releaseChangelog/publishReleaseNotes/publishReleaseNotes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";

type FakeGitOptions = Readonly<{
  tags?: string;
  ghReleaseView?: CommandResult;
  ghReleaseCreate?: CommandResult;
  log?: string;
  stat?: string;
  diff?: string;
  remoteUrl?: string;
  localTagExistsResult?: CommandResult;
  remoteLsRemoteOutput?: string;
}>;

function _createFakeGit(options: FakeGitOptions = {}): ReleaseCommands {
  const {
    tags = "v0.12.0\nv0.13.0",
    ghReleaseView = { ok: false, stdout: "", stderr: "release not found" },
    ghReleaseCreate = {
      ok: true,
      stdout: "https://github.com/org/repo/releases/tag/v0.13.0",
      stderr: "",
    },
    log = "sha1full\x1fA real change",
    stat = "1 file changed",
    diff = "diff --git a/foo b/foo",
    remoteUrl = "git@github.com:AvandarLabs/avandar.git",
    localTagExistsResult = { ok: true, stdout: "sha1full", stderr: "" },
    remoteLsRemoteOutput = "sha1full\trefs/tags/v0.13.0",
  } = options;

  return {
    repoRoot: "/fake/repo",
    dryRun: false,
    readGit: (args) => {
      const joined = args.join(" ");
      if (joined === "tag --list v* --sort=v:refname") return tags;
      if (joined.startsWith("log ")) return log;
      if (joined.startsWith("show --stat --format= ")) return stat;
      if (joined.startsWith("show --format= ")) return diff;
      if (joined === "remote get-url origin") return remoteUrl;
      if (joined.startsWith("ls-remote --tags origin")) {
        return remoteLsRemoteOutput;
      }
      return undefined;
    },
    tryGit: (args) => {
      if (args.join(" ").startsWith("rev-parse --verify --quiet refs/tags/")) {
        return localTagExistsResult;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    readCommand: (command, args) => {
      if (command === "gh" && args[0] === "release" && args[1] === "view") {
        return ghReleaseView;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    mutate: (command, args) => {
      if (command === "gh" && args[0] === "release" && args[1] === "create") {
        return ghReleaseCreate;
      }
      return { ok: true, stdout: "", stderr: "" };
    },
    mutateQuietly: () => {
      return { ok: true, stdout: "", stderr: "" };
    },
  };
}

const FAKE_BULLETS_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          bullets: [
            { group: "Features", text: "Did a thing", commits: ["sha1full"] },
          ],
        }),
      },
    },
  ],
};

function _fetchImpl(): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      return FAKE_BULLETS_RESPONSE;
    },
    text: async () => {
      return "";
    },
  } as Response) as unknown as typeof fetch;
}

const EMPTY_BULLETS_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({ bullets: [] }),
      },
    },
  ],
};

function _emptyBulletsFetchImpl(): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      return EMPTY_BULLETS_RESPONSE;
    },
    text: async () => {
      return "";
    },
  } as Response) as unknown as typeof fetch;
}

describe("publishReleaseNotes", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });
  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it("returns tag-not-found when the tag doesn't exist anywhere", async () => {
    const git = _createFakeGit({
      localTagExistsResult: { ok: false, stdout: "", stderr: "" },
      remoteLsRemoteOutput: "",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v9.9.9",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "tag-not-found" });
  });

  it("skips the tag-existence check during a dry-run preview", async () => {
    const git = _createFakeGit({
      localTagExistsResult: { ok: false, stdout: "", stderr: "" },
      remoteLsRemoteOutput: "",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.14.0",
      headRevision: "develop-head-sha",
      dryRun: true,
      skipExistenceChecks: true,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome.kind).toBe("previewed");
  });

  it("returns already-exists without calling gh release create", async () => {
    const mutateSpy = vi.fn().mockReturnValue({ ok: true, stdout: "", stderr: "" });
    const git = {
      ..._createFakeGit({
        ghReleaseView: {
          ok: true,
          stdout: '{"url":"https://github.com/org/repo/releases/tag/v0.13.0"}',
          stderr: "",
        },
      }),
      mutate: mutateSpy,
    };

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "already-exists",
      url: "https://github.com/org/repo/releases/tag/v0.13.0",
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("returns no-changes when every commit in range is housekeeping", async () => {
    const git = _createFakeGit({
      log: "sha1full\x1fRelease: v0.13.0 [skip deploy]",
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "no-changes" });
  });

  it("returns no-changes when the model returns zero bullets", async () => {
    const git = _createFakeGit();

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _emptyBulletsFetchImpl(),
    });

    expect(outcome).toEqual({ kind: "no-changes" });
  });

  it("previews notes on a dry run without calling gh release create", async () => {
    const mutateSpy = vi.fn().mockReturnValue({ ok: true, stdout: "", stderr: "" });
    const git = { ..._createFakeGit(), mutate: mutateSpy };

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: true,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({ kind: "previewed", notes: "- Did a thing" });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("publishes and returns the release URL on success", async () => {
    const git = _createFakeGit();

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "published",
      url: "https://github.com/AvandarLabs/avandar/releases/tag/v0.13.0",
    });
  });

  it("returns failed with gh's stderr when the release can't be created", async () => {
    const git = _createFakeGit({
      ghReleaseCreate: {
        ok: false,
        stdout: "",
        stderr: "HTTP 500: server error\nmore detail",
      },
    });

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome).toEqual({
      kind: "failed",
      reason: "HTTP 500: server error",
    });
  });

  it("returns failed when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const git = _createFakeGit();

    const outcome = await publishReleaseNotes(git, {
      releaseTag: "v0.13.0",
      dryRun: false,
      fetchImpl: _fetchImpl(),
    });

    expect(outcome.kind).toBe("failed");
  });
});
