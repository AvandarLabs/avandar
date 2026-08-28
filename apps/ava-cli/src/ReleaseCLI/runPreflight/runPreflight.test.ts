import {
  RELEASE_SOURCE_BRANCH,
  RELEASE_TARGET_BRANCH,
  runPreflight,
} from "@ava-cli/ReleaseCLI/runPreflight/runPreflight";
import { describe, expect, it } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCLI/createReleaseCommands";

/** What a test wants the fake repository to look like. */
type FakeRepoState = {
  /** The checked-out branch, or `"HEAD"` for a detached HEAD. */
  branch?: string;
  /** `git status --short` output; empty means a clean tree. */
  trackedChanges?: string;
  /** What `gh api repos/... .permissions.push` answers. */
  pushPermission?: CommandResult;
  /** Whether `git fetch` succeeds. */
  fetchOk?: boolean;
  /** Whether a local target branch exists to fast-forward later. */
  localMainExists?: boolean;
  originDevelop?: string;
  originMain?: string;
  localDevelop?: string;
  /** The `origin` URL, which decides whether the permission check applies. */
  remoteUrl?: string;
  /** Mirrors `createReleaseCommands`' `--dry-run` mode. */
  dryRun?: boolean;
};

const OK: CommandResult = { ok: true, stdout: "", stderr: "" };

/** A `FakeRepoState` with every default filled in. */
type ResolvedRepoState = Required<FakeRepoState>;

/** Fill in the defaults a test did not override. */
function _resolveRepoState(state: Readonly<FakeRepoState>): ResolvedRepoState {
  return {
    branch: RELEASE_SOURCE_BRANCH,
    trackedChanges: "",
    pushPermission: { ok: true, stdout: "true", stderr: "" },
    fetchOk: true,
    localMainExists: true,
    originDevelop: "develop-sha",
    originMain: "main-sha",
    localDevelop: "develop-sha",
    remoteUrl: "git@github.com:AvandarLabs/avandar.git",
    dryRun: false,
    ...state,
  };
}

/** The fake's `readGit`: the repo state, keyed by the git command asked for. */
function _createReadGit(
  state: ResolvedRepoState,
  executedCommands: string[],
): (args: readonly string[]) => string | undefined {
  return (args: readonly string[]): string | undefined => {
    executedCommands.push(`git ${args.join(" ")}`);
    const [verb] = args;
    const revision = args.at(-1) ?? "";
    return verb === "status"
      ? state.trackedChanges
      : verb === "remote"
        ? state.remoteUrl
        : verb !== "rev-parse"
          ? undefined
          : args.includes("--abbrev-ref")
            ? state.branch
            : revision.includes(`origin/${RELEASE_SOURCE_BRANCH}`)
              ? state.originDevelop
              : revision.includes(`origin/${RELEASE_TARGET_BRANCH}`)
                ? state.originMain
                : revision === RELEASE_SOURCE_BRANCH
                  ? state.localDevelop
                  : state.originMain;
  };
}

/** The fake's `tryGit`: the fetch result and the ref-existence probes. */
function _createTryGit(
  state: ResolvedRepoState,
  executedCommands: string[],
): (args: readonly string[]) => CommandResult {
  return (args: readonly string[]): CommandResult => {
    executedCommands.push(`git ${args.join(" ")}`);
    if (args[0] === "fetch") {
      return state.fetchOk
        ? OK
        : { ok: false, stdout: "", stderr: "permission denied" };
    }
    // `refExists` runs `rev-parse --verify --quiet <ref>` through here.
    const looksUpLocalMain = args.some((arg) => {
      return arg === `refs/heads/${RELEASE_TARGET_BRANCH}`;
    });
    return looksUpLocalMain && !state.localMainExists
      ? { ok: false, stdout: "", stderr: "" }
      : OK;
  };
}

/**
 * A `ReleaseCommands` that answers from canned state instead of running
 * anything, so preflight's refusals are testable without a repo, a remote, or
 * `gh`.
 *
 * It mirrors the real implementation where that matters: reads always execute,
 * while `mutate` and `mutateQuietly` short-circuit under `dryRun` exactly as
 * `createReleaseCommands` does. Without that fidelity, a check wired to a
 * mutation instead of a read would look identical here and misbehave for real.
 * Every executed command is recorded, which is how a test proves a refusal
 * happened before any network call.
 */
function _createFakeCommands(state: Readonly<FakeRepoState> = {}): {
  git: ReleaseCommands;
  executedCommands: string[];
} {
  const resolvedState = _resolveRepoState(state);
  const executedCommands: string[] = [];
  const recordMutation = (
    command: string,
    args: readonly string[],
  ): CommandResult => {
    if (resolvedState.dryRun) {
      return OK;
    }
    executedCommands.push(`MUTATE ${command} ${args.join(" ")}`);
    return OK;
  };

  const git: ReleaseCommands = {
    repoRoot: "/tmp/fake-repo",
    dryRun: resolvedState.dryRun,
    readGit: _createReadGit(resolvedState, executedCommands),
    tryGit: _createTryGit(resolvedState, executedCommands),
    readCommand: (command: string, args: readonly string[]): CommandResult => {
      executedCommands.push(`${command} ${args.join(" ")}`);
      return resolvedState.pushPermission;
    },
    mutate: recordMutation,
    mutateQuietly: recordMutation,
  };
  return { git, executedCommands };
}

/** Whether any executed command contained `fragment`. */
function _hasRunCommand(
  executedCommands: readonly string[],
  fragment: string,
): boolean {
  return executedCommands.some((command) => {
    return command.includes(fragment);
  });
}

describe("runPreflight", () => {
  it("passes when the repo is on develop, clean, writable, and in sync", () => {
    const { git } = _createFakeCommands();

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.originDevelopSha).toBe("develop-sha");
    expect(result.ok === true && result.originMainSha).toBe("main-sha");
    // Downstream, `updateLocalMainRef` branches on this.
    expect(result.ok === true && result.localMainSha).toBe("main-sha");
  });

  it("reports no local target branch on a fresh clone", () => {
    const { git } = _createFakeCommands({ localMainExists: false });

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.localMainSha).toBeUndefined();
  });

  it("refuses on the wrong branch before touching the network", () => {
    const { git, executedCommands } = _createFakeCommands({
      branch: "feat/something",
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("wrong-branch");
    // The offending branch has to reach the message the reviewer reads.
    expect(result.ok === false && result.message).toContain("feat/something");
    expect(_hasRunCommand(executedCommands, "gh")).toBe(false);
    expect(_hasRunCommand(executedCommands, "fetch")).toBe(false);
  });

  it("refuses on a detached HEAD", () => {
    const { git } = _createFakeCommands({ branch: "HEAD" });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("wrong-branch");
    expect(result.ok === false && result.message).toContain("detached HEAD");
  });

  it("refuses a dirty tree and shows what is dirty", () => {
    const { git } = _createFakeCommands({ trackedChanges: " M package.json" });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("dirty-tree");
    expect(result.ok === false && result.message).toContain(" M package.json");
  });

  it("refuses when gh reports no push access, before fetching", () => {
    const { git, executedCommands } = _createFakeCommands({
      pushPermission: { ok: true, stdout: "false", stderr: "" },
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("no-push-permission");
    expect(result.ok === false && result.message).toContain(
      "AvandarLabs/avandar",
    );
    // The point of the check is to refuse before anything is pushed.
    expect(_hasRunCommand(executedCommands, "fetch")).toBe(false);
  });

  it("checks push permission on a dry run too, and still lets it pass", () => {
    // A dry run must reach the same verdict as the real thing. Wiring this
    // check to a mutation instead of a read would make every dry run refuse,
    // because mutations short-circuit to empty output under `dryRun`.
    const { git, executedCommands } = _createFakeCommands({ dryRun: true });

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(_hasRunCommand(executedCommands, "gh api")).toBe(true);
  });

  it("refuses when gh cannot answer, rather than assuming access", () => {
    const { git } = _createFakeCommands({
      pushPermission: {
        ok: false,
        stdout: "",
        stderr: "gh: not logged in\nTry: gh auth login",
      },
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe(
      "unverified-push-permission",
    );
    // The first stderr line reaches the message; the hint block does not.
    expect(result.ok === false && result.message).toContain("not logged in");
    expect(result.ok === false && result.message).not.toContain("Try:");
    // ...and the message still says how to fix it.
    expect(result.ok === false && result.message).toContain("gh auth login");
  });

  it("still explains itself when gh fails silently", () => {
    const { git } = _createFakeCommands({
      pushPermission: { ok: false, stdout: "", stderr: "" },
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe(
      "unverified-push-permission",
    );
    expect(result.ok === false && result.message).toContain(
      "the gh CLI could not answer",
    );
  });

  it("skips the permission check when origin is not a GitHub remote", () => {
    const { git, executedCommands } = _createFakeCommands({
      remoteUrl: "/tmp/some/local/bare/repo",
    });

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(_hasRunCommand(executedCommands, "gh")).toBe(false);
  });

  it("refuses when the source branch is out of sync with origin", () => {
    const { git } = _createFakeCommands({ localDevelop: "some-other-sha" });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("out-of-sync");
    expect(result.ok === false && result.message).toContain(
      RELEASE_SOURCE_BRANCH,
    );
  });

  it("refuses when origin cannot be fetched", () => {
    const { git } = _createFakeCommands({ fetchOk: false });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("fetch-failed");
    // git's own reason has to survive into the message.
    expect(result.ok === false && result.message).toContain(
      "permission denied",
    );
  });
});
