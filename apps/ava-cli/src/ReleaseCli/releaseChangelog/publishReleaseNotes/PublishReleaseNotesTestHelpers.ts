import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";

const GITHUB_CREDITS_RESPONSE: CommandResult = {
  ok: true,
  stdout: JSON.stringify({
    data: {
      repository: {
        object: {
          authors: {
            nodes: [
              {
                name: "Human",
                user: { login: "jpsyx", __typename: "User" },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
          associatedPullRequests: {
            nodes: [],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    },
  }),
  stderr: "",
};

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

/** Creates a fake Git runner for release-note publishing tests. */
export function createFakeGit(options: FakeGitOptions = {}): ReleaseCommands {
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
      if (joined === "tag --list v* --sort=v:refname") {
        return tags;
      }
      if (joined.startsWith("log ")) {
        return log;
      }
      if (joined.startsWith("show --stat --format= ")) {
        return stat;
      }
      if (joined.startsWith("show --format= ")) {
        return diff;
      }
      if (joined === "remote get-url origin") {
        return remoteUrl;
      }
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
      return GITHUB_CREDITS_RESPONSE;
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
