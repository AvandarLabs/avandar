import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  confirmCiVerdict,
  confirmReleasePlan,
  printReleaseSummary,
  reportReleaseNotesOutcome,
} from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseConfirmationStages";
import {
  bumpSourceToNextVersion,
  commitReleaseVersionOnSource,
  publishTargetAndTag,
  updateLocalTargetRef,
} from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";
import type { ReleasePlan } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";

vi.mock("@ava-cli/ReleaseCli/releasePromptHelpers");

const OK: CommandResult = { ok: true, stdout: "", stderr: "" };

/** The checkout a fake `ReleaseCommands` describes. */
type FakeCheckout = {
  /** The checked-out branch, or undefined for a detached HEAD. */
  branch?: string;
  /** The commit HEAD starts at. Defaults to `source-sha`. */
  head?: string;
  /** `git status --short` output. Empty or omitted means a clean tree. */
  trackedChanges?: string;
  /** `git worktree list --porcelain` output. */
  worktreeList?: string;
  /** The origin URL. */
  remoteUrl?: string;
};

const TREE_SUFFIX = "^{tree}";

/**
 * What the fake's `readGit` answers. A tree lookup answers `<commit>-tree`, so
 * a test can tell which commit's tree a stage read.
 */
function _readFakeGit(
  options: Readonly<{
    checkout: FakeCheckout;
    head: string;
    args: readonly string[];
  }>,
): string | undefined {
  const { checkout, head, args } = options;
  const lastArg = args.at(-1) ?? "";
  switch (args[0]) {
    case "worktree":
      return checkout.worktreeList ?? "";
    case "remote":
      return checkout.remoteUrl;
    case "status":
      return checkout.trackedChanges ?? "";
    case "symbolic-ref":
      return checkout.branch === undefined
        ? undefined
        : `refs/heads/${checkout.branch}`;
    default:
      return lastArg.endsWith(TREE_SUFFIX)
        ? `${lastArg.slice(0, -TREE_SUFFIX.length)}-tree`
        : lastArg === "HEAD"
          ? head
          : undefined;
  }
}

/**
 * A `ReleaseCommands` that runs nothing and records every mutation as one
 * space-joined string, so a test can assert the exact commands a stage would
 * run. `commit-tree` answers with `release-commit-sha`, and a `git commit`
 * moves HEAD to `version-commit-sha`.
 */
function _createFakeCommands(checkout: Readonly<FakeCheckout> = {}): {
  git: ReleaseCommands;
  mutations: string[];
} {
  const mutations: string[] = [];
  let head = checkout.head ?? "source-sha";
  const recordMutation = (
    command: string,
    args: readonly string[],
  ): CommandResult => {
    mutations.push([command, ...args].join(" "));
    if (command === "git" && args[0] === "commit") {
      head = "version-commit-sha";
    }
    return args[0] === "commit-tree"
      ? { ok: true, stdout: "release-commit-sha", stderr: "" }
      : OK;
  };
  const git: ReleaseCommands = {
    repoRoot: "/tmp/fake-repo",
    dryRun: false,
    readGit: (args: readonly string[]) => {
      return _readFakeGit({ checkout, head, args });
    },
    tryGit: () => {
      return OK;
    },
    readCommand: () => {
      return OK;
    },
    mutate: recordMutation,
    mutateQuietly: recordMutation,
  };
  return { git, mutations };
}

/** The plan the tests release: 0.14.2, with develop moving to 0.14.3-dev. */
const RELEASE_PLAN: Readonly<ReleasePlan> = {
  sourceVersion: "0.14.2-dev",
  releaseVersion: "0.14.2",
  nextVersion: "0.14.3",
  releaseTag: "v0.14.2",
};

/** Everything a spied `Acclimate.log` printed, one call per line. */
function _getLoggedText(): string {
  return vi
    .mocked(Acclimate.log)
    .mock.calls.map((call) => {
      return call
        .map((arg) => {
          return typeof arg === "string" ? arg : JSON.stringify(arg);
        })
        .join(" ");
    })
    .join("\n");
}

describe("release stages", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets develop to 0.14.2 and pushes it by full ref", () => {
    const { git, mutations } = _createFakeCommands({ branch: "develop" });

    const releaseSha = commitReleaseVersionOnSource(git, {
      plan: RELEASE_PLAN,
      originSourceSha: "source-sha",
    });

    expect(mutations).toEqual([
      "pnpm version 0.14.2 --no-git-tag-version",
      "git commit -m Release: v0.14.2 [skip deploy] -- package.json",
      "git push origin HEAD:refs/heads/develop",
    ]);
    expect(releaseSha).toBe("version-commit-sha");
  });

  it("commits nothing when develop is already at 0.14.2", () => {
    const { git, mutations } = _createFakeCommands({ branch: "develop" });

    const releaseSha = commitReleaseVersionOnSource(git, {
      plan: {
        ...RELEASE_PLAN,
        sourceVersion: "0.14.2",
      },
      originSourceSha: "source-sha",
    });

    expect(mutations).toEqual([]);
    expect(releaseSha).toBe("source-sha");
  });

  it.each<[string, FakeCheckout]>([
    ["HEAD moved since preflight", { branch: "develop", head: "moved-sha" }],
    ["the checkout is on another branch", { branch: "main" }],
    ["the checkout is a detached HEAD", {}],
    [
      "a tracked file is modified",
      { branch: "develop", trackedChanges: " M src/app.ts" },
    ],
  ])(
    "refuses to commit the release version, running nothing, when %s",
    (_condition, checkout) => {
      const { git, mutations } = _createFakeCommands(checkout);

      expect(() => {
        return commitReleaseVersionOnSource(git, {
          plan: RELEASE_PLAN,
          originSourceSha: "source-sha",
        });
      }).toThrow(/Nothing has been released\.$/);
      expect(mutations).toEqual([]);
    },
  );

  it("bumps develop to 0.14.3-dev and pushes it by full ref", () => {
    const { git, mutations } = _createFakeCommands();

    bumpSourceToNextVersion(git, RELEASE_PLAN);

    expect(mutations).toEqual([
      "pnpm version 0.14.3-dev --no-git-tag-version",
      "git commit -m Bump version to 0.14.3-dev [skip deploy] -- package.json",
      "git push origin HEAD:refs/heads/develop",
    ]);
  });

  it("publishes refs/heads/main and tag v0.14.2 atomically", () => {
    const { git, mutations } = _createFakeCommands();

    const releaseCommitSha = publishTargetAndTag(git, {
      plan: RELEASE_PLAN,
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(releaseCommitSha).toBe("release-commit-sha");
    expect(mutations.slice(1)).toEqual([
      "git tag -a v0.14.2 -m v0.14.2 release-commit-sha",
      "git push --atomic origin release-commit-sha:refs/heads/main refs/tags/v0.14.2:refs/tags/v0.14.2",
    ]);
  });

  it("titles the release commit Release 0.14.2, carrying develop's tree onto main", () => {
    const { git, mutations } = _createFakeCommands();

    publishTargetAndTag(git, {
      plan: RELEASE_PLAN,
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations[0]).toBe(
      "git commit-tree release-sha-tree -p target-sha -p release-sha -m Release 0.14.2\n\nSets main to develop's tree at release-sha verbatim. Written with git commit-tree, so this is a two-parent merge carrying develop's exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.",
    );
  });

  it("fast-forwards local main after a release", () => {
    const { git, mutations } = _createFakeCommands();

    updateLocalTargetRef(git, {
      releaseCommitSha: "release-commit-sha",
      localTargetSha: "target-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations).toEqual([
      "git update-ref refs/heads/main release-commit-sha",
    ]);
  });

  it("leaves local main alone while a worktree has it checked out", () => {
    const { git, mutations } = _createFakeCommands({
      worktreeList: "worktree /tmp/main-checkout\nbranch refs/heads/main",
    });

    updateLocalTargetRef(git, {
      releaseCommitSha: "release-commit-sha",
      localTargetSha: "target-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations).toEqual([]);
  });
});

describe("reportReleaseNotesOutcome", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints nothing when notes were published", () => {
    reportReleaseNotesOutcome(
      { kind: "published", url: "https://github.com/x/y/releases/tag/v0.14.2" },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(Acclimate.log).not.toHaveBeenCalled();
  });

  it("prints the preview notes on a dry run without a retry hint", () => {
    reportReleaseNotesOutcome(
      { kind: "previewed", notes: "- Did a thing" },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("Did a thing");
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("prints an informational line for no-changes", () => {
    reportReleaseNotesOutcome(
      { kind: "no-changes" },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("No commits found");
  });

  it("warns and prints the retry command when publishing failed", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("network error");
    expect(_getLoggedText()).toContain("ava release notes --version 0.14.2");
  });

  it("warns when a release already exists, without a retry hint", () => {
    reportReleaseNotesOutcome(
      {
        kind: "already-exists",
        url: "https://github.com/x/y/releases/tag/v0.14.2",
      },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain(
      "Release notes already exist for v0.14.2",
    );
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("warns and prints the retry command when the tag can't be found", () => {
    reportReleaseNotesOutcome(
      { kind: "tag-not-found" },
      { plan: RELEASE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("Could not find tag v0.14.2");
    expect(_getLoggedText()).toContain("ava release notes --version 0.14.2");
  });

  it("suppresses the retry hint for a failed outcome on a dry run", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      { plan: RELEASE_PLAN, dryRun: true },
    );
    expect(_getLoggedText()).toContain("network error");
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("suppresses the retry hint for tag-not-found on a dry run", () => {
    reportReleaseNotesOutcome(
      { kind: "tag-not-found" },
      { plan: RELEASE_PLAN, dryRun: true },
    );
    expect(_getLoggedText()).not.toContain("ava release notes");
  });
});

/** A run URL the fake `gh run list` reports, so a test can find it. */
const CI_RUN_URL = "https://github.com/AvandarLabs/avandar/actions/runs/1";

/**
 * What the fake `gh run list` answers for each verdict on `source-sha`: the
 * runs JSON, or a failed command for the verdict that cannot be checked.
 */
const GH_RESULT_BY_VERDICT: Readonly<Record<string, CommandResult>> = {
  passed: {
    ok: true,
    stdout: JSON.stringify([
      {
        headSha: "source-sha",
        status: "completed",
        conclusion: "success",
        url: CI_RUN_URL,
      },
    ]),
    stderr: "",
  },
  failed: {
    ok: true,
    stdout: JSON.stringify([
      {
        headSha: "source-sha",
        status: "completed",
        conclusion: "failure",
        url: CI_RUN_URL,
      },
    ]),
    stderr: "",
  },
  pending: {
    ok: true,
    stdout: JSON.stringify([
      {
        headSha: "source-sha",
        status: "in_progress",
        conclusion: "",
        url: CI_RUN_URL,
      },
    ]),
    stderr: "",
  },
  missing: { ok: true, stdout: "[]", stderr: "" },
  unknown: { ok: false, stdout: "", stderr: "gh: not logged in" },
};

/**
 * Fake commands whose `gh run list` reports `verdict` for `source-sha`, plus
 * every non-git command they were asked to read.
 */
function _createFakeCommandsWithCi(verdict: string): {
  git: ReleaseCommands;
  mutations: string[];
  readCommands: string[];
} {
  const { git, mutations } = _createFakeCommands();
  const readCommands: string[] = [];
  const ghResult = GH_RESULT_BY_VERDICT[verdict] ?? OK;
  return {
    git: {
      ...git,
      readCommand: (command: string, args: readonly string[]) => {
        readCommands.push([command, ...args].join(" "));
        return ghResult;
      },
    },
    mutations,
    readCommands,
  };
}

/** Every verdict other than a pass, which asks before releasing. */
const NON_PASSING_VERDICTS = ["failed", "pending", "missing", "unknown"];

describe("confirmCiVerdict", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
    vi.mocked(promptToConfirm).mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(promptToConfirm).mockReset();
  });

  it.each(["failed", "pending"])(
    "names the run URL when a %s run exists",
    async (verdict) => {
      const { git } = _createFakeCommandsWithCi(verdict);

      await confirmCiVerdict(git, {
        commitSha: "source-sha",
        assumeYes: true,
        skip: false,
      });

      expect(_getLoggedText()).toContain(CI_RUN_URL);
    },
  );

  it("proceeds on a passed staging run without asking", async () => {
    const { git, mutations } = _createFakeCommandsWithCi("passed");

    await confirmCiVerdict(git, {
      commitSha: "source-sha",
      assumeYes: false,
      skip: false,
    });

    expect(promptToConfirm).not.toHaveBeenCalled();
    expect(mutations).toEqual([]);
  });

  it.each(NON_PASSING_VERDICTS)(
    "proceeds on a %s verdict with assumeYes, without asking",
    async (verdict) => {
      const { git } = _createFakeCommandsWithCi(verdict);

      await confirmCiVerdict(git, {
        commitSha: "source-sha",
        assumeYes: true,
        skip: false,
      });

      expect(promptToConfirm).not.toHaveBeenCalled();
    },
  );

  it.each(NON_PASSING_VERDICTS)(
    "asks before a release on a %s verdict",
    async (verdict) => {
      const { git } = _createFakeCommandsWithCi(verdict);

      await confirmCiVerdict(git, {
        commitSha: "source-sha",
        assumeYes: false,
        skip: false,
      });

      expect(promptToConfirm).toHaveBeenCalledExactlyOnceWith(
        "Release anyway?",
      );
    },
  );

  it("refuses a failed verdict with no terminal to ask on, changing nothing", async () => {
    const actualPromptHelpers = await vi.importActual<
      typeof import("@ava-cli/ReleaseCli/releasePromptHelpers")
    >("@ava-cli/ReleaseCli/releasePromptHelpers");
    vi.mocked(promptToConfirm).mockImplementation(
      actualPromptHelpers.promptToConfirm,
    );
    const requestInput = vi.spyOn(Acclimate, "requestInput");
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = false;
    const { git, mutations } = _createFakeCommandsWithCi("failed");

    try {
      await expect(
        confirmCiVerdict(git, {
          commitSha: "source-sha",
          assumeYes: false,
          skip: false,
        }),
      ).rejects.toThrow(
        "A confirmation was not provided and there is no terminal to ask on.",
      );
    } finally {
      process.stdin.isTTY = originalIsTTY;
    }
    expect(requestInput).not.toHaveBeenCalled();
    expect(mutations).toEqual([]);
  });

  it("aborts a release when the reviewer declines a failed verdict", async () => {
    vi.mocked(promptToConfirm).mockResolvedValue(false);
    const { git } = _createFakeCommandsWithCi("failed");

    await expect(
      confirmCiVerdict(git, {
        commitSha: "source-sha",
        assumeYes: false,
        skip: false,
      }),
    ).rejects.toThrow("Aborted.");
  });

  it("warns that --skip-ci-check skips develop's CI check, without checking it", async () => {
    const { git, readCommands } = _createFakeCommandsWithCi("failed");

    await confirmCiVerdict(git, {
      commitSha: "source-sha",
      assumeYes: true,
      skip: true,
    });

    expect(readCommands).toEqual([]);
    expect(_getLoggedText()).toContain("Skipping develop's CI check.");
  });
});

describe("confirmReleasePlan", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
    vi.mocked(promptToConfirm).mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks to release 0.14.2", async () => {
    const { git } = _createFakeCommands();

    await confirmReleasePlan(git, {
      plan: RELEASE_PLAN,
      originSourceSha: "source-sha",
      originTargetSha: "target-sha",
      assumeYes: false,
    });

    expect(promptToConfirm).toHaveBeenCalledExactlyOnceWith("Release 0.14.2?");
  });

  it("warns that pushing main deploys production before asking", async () => {
    const { git } = _createFakeCommands();

    await confirmReleasePlan(git, {
      plan: RELEASE_PLAN,
      originSourceSha: "source-sha",
      originTargetSha: "target-sha",
      assumeYes: false,
    });

    expect(_getLoggedText()).toContain(
      "Pushing main deploys production and migrates the production database.",
    );
  });

  it("aborts when the reviewer declines", async () => {
    vi.mocked(promptToConfirm).mockResolvedValue(false);
    const { git } = _createFakeCommands();

    await expect(
      confirmReleasePlan(git, {
        plan: RELEASE_PLAN,
        originSourceSha: "source-sha",
        originTargetSha: "target-sha",
        assumeYes: false,
      }),
    ).rejects.toThrow("Aborted.");
  });
});

describe("printReleaseSummary", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {
      return undefined;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("links the production.yaml deploy run", () => {
    const { git } = _createFakeCommands({
      remoteUrl: "git@github.com:AvandarLabs/avandar.git",
    });

    printReleaseSummary(git, {
      plan: RELEASE_PLAN,
      releaseSha: "release-sha",
    });

    expect(_getLoggedText()).toContain(
      "Deploy run: https://github.com/AvandarLabs/avandar/actions/workflows/production.yaml",
    );
    expect(_getLoggedText()).toContain(
      "https://github.com/AvandarLabs/avandar/releases/tag/v0.14.2",
    );
  });
});
