import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { runPreflight } from "@ava-cli/ReleaseCli/runPreflight/runPreflight";
import { describe, expect, it } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";

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
  localTargetExists?: boolean;
  /** Tip of `origin/<branch>`. */
  originSource?: string;
  /** Tip of the origin target branch, or `undefined` when it does not exist. */
  originTarget?: string | undefined;
  /** Tip of the local checked-out branch (`refs/heads/<branch>`). */
  localSource?: string;
  /**
   * A tag named like the checked-out branch, or `undefined` for none. As in
   * git, a bare `develop` or `alpha-dev` then resolves to the tag.
   */
  sourceTag?: string | undefined;
  /** Tip of the local target branch (`refs/heads/<target>`). */
  localTarget?: string;
  /**
   * A tag named like the target branch, or `undefined` for none. As in git, a
   * bare `main` or `alpha` then resolves to the tag, not the branch.
   */
  targetTag?: string | undefined;
  /** The `origin` URL, which decides whether the permission check applies. */
  remoteUrl?: string;
  /** Mirrors `createReleaseCommands`' `--dry-run` mode. */
  dryRun?: boolean;
};

const OK: CommandResult = { ok: true, stdout: "", stderr: "" };

/** Each source branch's target, so the fake can answer for either line. */
const TARGET_BRANCH_BY_SOURCE: Readonly<Record<string, string>> = {
  develop: "main",
  "alpha-dev": "alpha",
};

/**
 * Branches preflight must refuse. Besides the target branches and a feature
 * branch, these are near-misses of a source branch, so a prefix, suffix, or
 * substring match on `develop` or `alpha-dev` turns these tests red.
 */
const REFUSED_BRANCHES: readonly string[] = [
  "main",
  "alpha",
  "feat/something",
  "demo/measles",
  "alpha-dev-old",
  "alpha-dev/x",
  "develop2",
  "heads/alpha-dev",
  "origin/alpha-dev",
];

/**
 * A `FakeRepoState` with every default filled in. The fields that may be
 * `undefined` are listed apart, since `Required` would strip `undefined`.
 */
type ResolvedRepoState = Required<
  Omit<FakeRepoState, "originTarget" | "sourceTag" | "targetTag">
> & {
  originTarget: string | undefined;
  sourceTag: string | undefined;
  targetTag: string | undefined;
};

/** Fill in the defaults a test did not override. */
function _resolveRepoState(state: Readonly<FakeRepoState>): ResolvedRepoState {
  return {
    branch: MAINLINE_RELEASE_LINE.sourceBranch,
    trackedChanges: "",
    pushPermission: { ok: true, stdout: "true", stderr: "" },
    fetchOk: true,
    localTargetExists: true,
    originSource: "source-sha",
    originTarget: "target-sha",
    localSource: "source-sha",
    sourceTag: undefined,
    localTarget: "local-target-sha",
    targetTag: undefined,
    remoteUrl: "git@github.com:AvandarLabs/avandar.git",
    dryRun: false,
    ...state,
  };
}

/**
 * What `rev-parse` answers for `revision` in the fake repo. Keys are exact,
 * since `origin/alpha` is a prefix of `origin/alpha-dev`. As in git, a bare
 * branch name resolves to a same-named tag when one exists.
 */
function _resolveRevision(
  state: ResolvedRepoState,
  revision: string,
): string | undefined {
  const targetBranch = TARGET_BRANCH_BY_SOURCE[state.branch];
  const tipByRevision: Record<string, string | undefined> = {
    [`refs/remotes/origin/${state.branch}`]: state.originSource,
    [`refs/remotes/origin/${targetBranch}`]: state.originTarget,
    [`refs/heads/${state.branch}`]: state.localSource,
    [state.branch]: state.sourceTag ?? state.localSource,
    [`refs/heads/${targetBranch}`]: state.localTarget,
    [`${targetBranch}`]: state.targetTag ?? state.localTarget,
  };
  return tipByRevision[revision];
}

/** The fake's `readGit`: the repo state, keyed by the git command asked for. */
function _createReadGit(
  state: ResolvedRepoState,
  executedCommands: string[],
): (args: readonly string[]) => string | undefined {
  return (args: readonly string[]): string | undefined => {
    executedCommands.push(`git ${args.join(" ")}`);
    const [verb] = args;
    return verb === "status"
      ? state.trackedChanges
      : verb === "remote"
        ? state.remoteUrl
        : verb !== "rev-parse"
          ? undefined
          : args.includes("--abbrev-ref")
            ? state.branch
            : _resolveRevision(state, args.at(-1) ?? "");
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
    const looksUpLocalTarget = args.some((arg) => {
      return arg === `refs/heads/${TARGET_BRANCH_BY_SOURCE[state.branch]}`;
    });
    return looksUpLocalTarget && !state.localTargetExists
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
    expect(result.ok === true && result.originSourceSha).toBe("source-sha");
    expect(result.ok === true && result.originTargetSha).toBe("target-sha");
    // Downstream, `updateLocalMainRef` branches on this.
    expect(result.ok === true && result.localTargetSha).toBe(
      "local-target-sha",
    );
  });

  it("resolves the mainline release line on develop", () => {
    const { git } = _createFakeCommands({
      branch: MAINLINE_RELEASE_LINE.sourceBranch,
    });

    const result = runPreflight(git);

    expect(result.ok === true && result.line).toBe(MAINLINE_RELEASE_LINE);
  });

  it("resolves the alpha release line on alpha-dev", () => {
    const { git } = _createFakeCommands({
      branch: ALPHA_RELEASE_LINE.sourceBranch,
    });

    const result = runPreflight(git);

    expect(result.ok === true && result.line).toBe(ALPHA_RELEASE_LINE);
  });

  it("reads alpha-dev's release refs from origin/alpha-dev, origin/alpha, and local alpha", () => {
    const { git } = _createFakeCommands({
      branch: ALPHA_RELEASE_LINE.sourceBranch,
    });

    const result = runPreflight(git);

    expect(result.ok === true && result.originSourceSha).toBe("source-sha");
    expect(result.ok === true && result.originTargetSha).toBe("target-sha");
    expect(result.ok === true && result.localTargetSha).toBe(
      "local-target-sha",
    );
  });

  it.each([
    MAINLINE_RELEASE_LINE.sourceBranch,
    ALPHA_RELEASE_LINE.sourceBranch,
  ])(
    "reads the local target branch on %s, not a tag with the same name",
    (branch) => {
      const { git } = _createFakeCommands({ branch, targetTag: "tag-sha" });

      const result = runPreflight(git);

      expect(result.ok === true && result.localTargetSha).toBe(
        "local-target-sha",
      );
    },
  );

  it("reports no local target branch on a fresh clone", () => {
    const { git } = _createFakeCommands({ localTargetExists: false });

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.localTargetSha).toBeUndefined();
  });

  it("reports no local alpha branch on a fresh clone of alpha-dev", () => {
    const { git } = _createFakeCommands({
      branch: ALPHA_RELEASE_LINE.sourceBranch,
      localTargetExists: false,
    });

    const result = runPreflight(git);

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.localTargetSha).toBeUndefined();
  });

  it.each([...REFUSED_BRANCHES, "HEAD"])(
    "refuses %s as the wrong branch",
    (branch) => {
      const { git } = _createFakeCommands({ branch });

      const result = runPreflight(git);

      expect(result.ok === false && result.reason).toBe("wrong-branch");
    },
  );

  it.each(REFUSED_BRANCHES)(
    "names %s and both source branches in the refusal",
    (branch) => {
      const { git } = _createFakeCommands({ branch });

      const result = runPreflight(git);

      // The offending branch has to reach the message the reviewer reads.
      expect(result.ok === false && result.message).toContain(`"${branch}"`);
      expect(result.ok === false && result.message).toContain(
        '"alpha-dev" or "develop"',
      );
    },
  );

  it("names a detached HEAD and both source branches in the refusal", () => {
    const { git } = _createFakeCommands({ branch: "HEAD" });

    const result = runPreflight(git);

    expect(result.ok === false && result.message).toContain("detached HEAD");
    expect(result.ok === false && result.message).toContain(
      '"alpha-dev" or "develop"',
    );
  });

  it.each([...REFUSED_BRANCHES, "HEAD"])(
    "runs only the branch lookup on %s",
    (branch) => {
      const { git, executedCommands } = _createFakeCommands({ branch });

      runPreflight(git);

      // No status, gh, fetch, or push follows a refused branch.
      expect(executedCommands).toHaveLength(1);
    },
  );

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

  it("refuses when develop is out of sync with origin/develop", () => {
    const { git } = _createFakeCommands({ localSource: "some-other-sha" });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("out-of-sync");
    expect(result.ok === false && result.message).toContain(
      `origin/${MAINLINE_RELEASE_LINE.sourceBranch}`,
    );
  });

  it("refuses when alpha-dev is out of sync with origin/alpha-dev", () => {
    const { git } = _createFakeCommands({
      branch: ALPHA_RELEASE_LINE.sourceBranch,
      localSource: "some-other-sha",
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("out-of-sync");
    expect(result.ok === false && result.message).toContain(
      `origin/${ALPHA_RELEASE_LINE.sourceBranch}`,
    );
  });

  it.each([
    MAINLINE_RELEASE_LINE.sourceBranch,
    ALPHA_RELEASE_LINE.sourceBranch,
  ])(
    "refuses unpushed %s commits even when a same-named tag matches origin",
    (branch) => {
      const { git } = _createFakeCommands({
        branch,
        localSource: "unpushed-sha",
        sourceTag: "source-sha",
      });

      const result = runPreflight(git);

      expect(result.ok === false && result.reason).toBe("out-of-sync");
    },
  );

  it("refuses when origin/main is missing, without the alpha hint", () => {
    const { git } = _createFakeCommands({ originTarget: undefined });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("missing-ref");
    expect(result.ok === false && result.message).toBe(
      "origin/main does not exist.",
    );
  });

  it("refuses when origin/alpha is missing, giving the command to create it", () => {
    const { git } = _createFakeCommands({
      branch: ALPHA_RELEASE_LINE.sourceBranch,
      originTarget: undefined,
    });

    const result = runPreflight(git);

    expect(result.ok === false && result.reason).toBe("missing-ref");
    expect(result.ok === false && result.message).toBe(
      "origin/alpha does not exist. For the first alpha release, create it at main's commit first: git push origin refs/remotes/origin/main:refs/heads/alpha",
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
