import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { promptToConfirm } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
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
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import type { ReleasePlan } from "@ava-cli/ReleaseCli/runRelease/releaseStageHelpers/releaseStageHelpers";

vi.mock("@ava-cli/ReleaseCli/releasePromptHelpers");

const OK: CommandResult = { ok: true, stdout: "", stderr: "" };

/**
 * A `ReleaseCommands` that runs nothing and records every mutation as one
 * space-joined string, so a test can assert the exact commands a stage would
 * run. `commit-tree` answers with `release-commit-sha`, a tree lookup with
 * `tree-sha`, `worktree list` with `worktreeList`, and the origin URL with
 * `remoteUrl`.
 */
function _createFakeCommands(
  options: Readonly<{ worktreeList?: string; remoteUrl?: string }> = {},
): { git: ReleaseCommands; mutations: string[] } {
  const mutations: string[] = [];
  const recordMutation = (
    command: string,
    args: readonly string[],
  ): CommandResult => {
    mutations.push([command, ...args].join(" "));
    return args[0] === "commit-tree"
      ? { ok: true, stdout: "release-commit-sha", stderr: "" }
      : OK;
  };
  const git: ReleaseCommands = {
    repoRoot: "/tmp/fake-repo",
    dryRun: false,
    readGit: (args: readonly string[]) => {
      const lastArg = args.at(-1) ?? "";
      return args[0] === "worktree"
        ? (options.worktreeList ?? "")
        : args[0] === "remote"
          ? options.remoteUrl
          : lastArg.endsWith("^{tree}")
            ? "tree-sha"
            : lastArg === "HEAD"
              ? "head-sha"
              : undefined;
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

/** Each line's test plan versions: 0.15.0 on alpha, 0.14.2 on mainline. */
const PLAN_VERSIONS_BY_KIND: Readonly<
  Record<ReleaseLine["kind"], Omit<ReleasePlan, "line">>
> = {
  alpha: {
    sourceVersion: "0.15.0-alpha-dev",
    releaseVersion: "0.15.0",
    publishedVersion: "0.15.0-alpha",
    nextVersion: "0.15.1",
    releaseTag: "v0.15.0-alpha",
  },
  mainline: {
    sourceVersion: "0.14.2-dev",
    releaseVersion: "0.14.2",
    publishedVersion: "0.14.2",
    nextVersion: "0.14.3",
    releaseTag: "v0.14.2",
  },
};

/** A plan for releasing `line` at its versions in `PLAN_VERSIONS_BY_KIND`. */
function _createPlan(line: ReleaseLine): ReleasePlan {
  return { line, ...PLAN_VERSIONS_BY_KIND[line.kind] };
}

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

  it("sets alpha-dev to 0.15.0-alpha and pushes it by full ref on the alpha line", () => {
    const { git, mutations } = _createFakeCommands();

    const releaseSha = commitReleaseVersionOnSource(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      originSourceSha: "source-sha",
    });

    expect(mutations).toEqual([
      "pnpm version 0.15.0-alpha --no-git-tag-version",
      "git commit -am Release: v0.15.0-alpha [skip deploy]",
      "git push origin HEAD:refs/heads/alpha-dev",
    ]);
    expect(releaseSha).toBe("head-sha");
  });

  it("sets develop to 0.14.2 and pushes it by full ref on the mainline", () => {
    const { git, mutations } = _createFakeCommands();

    commitReleaseVersionOnSource(git, {
      plan: _createPlan(MAINLINE_RELEASE_LINE),
      originSourceSha: "source-sha",
    });

    expect(mutations).toEqual([
      "pnpm version 0.14.2 --no-git-tag-version",
      "git commit -am Release: v0.14.2 [skip deploy]",
      "git push origin HEAD:refs/heads/develop",
    ]);
  });

  it("commits nothing when alpha-dev is already at 0.15.0-alpha", () => {
    const { git, mutations } = _createFakeCommands();

    const releaseSha = commitReleaseVersionOnSource(git, {
      plan: {
        ..._createPlan(ALPHA_RELEASE_LINE),
        sourceVersion: "0.15.0-alpha",
      },
      originSourceSha: "source-sha",
    });

    expect(mutations).toEqual([]);
    expect(releaseSha).toBe("head-sha");
  });

  it("bumps alpha-dev to 0.15.1-alpha-dev and pushes it by full ref", () => {
    const { git, mutations } = _createFakeCommands();

    bumpSourceToNextVersion(git, _createPlan(ALPHA_RELEASE_LINE));

    expect(mutations).toEqual([
      "pnpm version 0.15.1-alpha-dev --no-git-tag-version",
      "git commit -am Bump version to 0.15.1-alpha-dev [skip deploy]",
      "git push origin HEAD:refs/heads/alpha-dev",
    ]);
  });

  it("bumps develop to 0.14.3-dev and pushes it by full ref", () => {
    const { git, mutations } = _createFakeCommands();

    bumpSourceToNextVersion(git, _createPlan(MAINLINE_RELEASE_LINE));

    expect(mutations).toEqual([
      "pnpm version 0.14.3-dev --no-git-tag-version",
      "git commit -am Bump version to 0.14.3-dev [skip deploy]",
      "git push origin HEAD:refs/heads/develop",
    ]);
  });

  it("publishes refs/heads/alpha and tag v0.15.0-alpha atomically on the alpha line", () => {
    const { git, mutations } = _createFakeCommands();

    const releaseCommitSha = publishTargetAndTag(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(releaseCommitSha).toBe("release-commit-sha");
    expect(mutations.slice(1)).toEqual([
      "git tag -a v0.15.0-alpha -m v0.15.0-alpha release-commit-sha",
      "git push --atomic origin release-commit-sha:refs/heads/alpha refs/tags/v0.15.0-alpha:refs/tags/v0.15.0-alpha",
    ]);
  });

  it("publishes refs/heads/main and tag v0.14.2 atomically on the mainline", () => {
    const { git, mutations } = _createFakeCommands();

    publishTargetAndTag(git, {
      plan: _createPlan(MAINLINE_RELEASE_LINE),
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations.slice(1)).toEqual([
      "git tag -a v0.14.2 -m v0.14.2 release-commit-sha",
      "git push --atomic origin release-commit-sha:refs/heads/main refs/tags/v0.14.2:refs/tags/v0.14.2",
    ]);
  });

  it("builds the alpha release commit from alpha-dev's tree on top of origin/alpha", () => {
    const { git, mutations } = _createFakeCommands();

    publishTargetAndTag(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations[0]).toBe(
      "git commit-tree tree-sha -p target-sha -p release-sha -m Release 0.15.0-alpha\n\nSets alpha to alpha-dev's tree at release-sha verbatim. Written with git commit-tree, so this is a two-parent merge carrying alpha-dev's exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.",
    );
  });

  it("titles the mainline release commit Release 0.14.2, carrying develop's tree onto main", () => {
    const { git, mutations } = _createFakeCommands();

    publishTargetAndTag(git, {
      plan: _createPlan(MAINLINE_RELEASE_LINE),
      releaseSha: "release-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations[0]).toBe(
      "git commit-tree tree-sha -p target-sha -p release-sha -m Release 0.14.2\n\nSets main to develop's tree at release-sha verbatim. Written with git commit-tree, so this is a two-parent merge carrying develop's exact content with no merge resolution. See apps/ava-cli/src/ReleaseCli.",
    );
  });

  it("fast-forwards local alpha, not main, after an alpha release", () => {
    const { git, mutations } = _createFakeCommands();

    updateLocalTargetRef(git, {
      line: ALPHA_RELEASE_LINE,
      releaseCommitSha: "release-commit-sha",
      localTargetSha: "target-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations).toEqual([
      "git update-ref refs/heads/alpha release-commit-sha",
    ]);
  });

  it("leaves local alpha alone while a worktree has it checked out", () => {
    const { git, mutations } = _createFakeCommands({
      worktreeList: "worktree /tmp/alpha-checkout\nbranch refs/heads/alpha",
    });

    updateLocalTargetRef(git, {
      line: ALPHA_RELEASE_LINE,
      releaseCommitSha: "release-commit-sha",
      localTargetSha: "target-sha",
      originTargetSha: "target-sha",
    });

    expect(mutations).toEqual([]);
  });
});

describe("reportReleaseNotesOutcome", () => {
  const MAINLINE_PLAN = _createPlan(MAINLINE_RELEASE_LINE);
  const ALPHA_PLAN = _createPlan(ALPHA_RELEASE_LINE);

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
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(Acclimate.log).not.toHaveBeenCalled();
  });

  it("prints the preview notes on a dry run without a retry hint", () => {
    reportReleaseNotesOutcome(
      { kind: "previewed", notes: "- Did a thing" },
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("Did a thing");
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("prints an informational line for no-changes", () => {
    reportReleaseNotesOutcome(
      { kind: "no-changes" },
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("No commits found");
  });

  it("warns and prints the retry command when publishing failed", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("network error");
    expect(_getLoggedText()).toContain("ava release notes --version 0.14.2");
    expect(_getLoggedText()).not.toContain("--alpha");
  });

  it("warns when a release already exists, without a retry hint", () => {
    reportReleaseNotesOutcome(
      {
        kind: "already-exists",
        url: "https://github.com/x/y/releases/tag/v0.14.2",
      },
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain(
      "Release notes already exist for v0.14.2",
    );
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("warns and prints the retry command when the tag can't be found", () => {
    reportReleaseNotesOutcome(
      { kind: "tag-not-found" },
      { plan: MAINLINE_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("Could not find tag v0.14.2");
    expect(_getLoggedText()).toContain("ava release notes --version 0.14.2");
  });

  it("suppresses the retry hint for a failed outcome on a dry run", () => {
    reportReleaseNotesOutcome(
      { kind: "failed", reason: "network error" },
      { plan: MAINLINE_PLAN, dryRun: true },
    );
    expect(_getLoggedText()).toContain("network error");
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("suppresses the retry hint for tag-not-found on a dry run", () => {
    reportReleaseNotesOutcome(
      { kind: "tag-not-found" },
      { plan: MAINLINE_PLAN, dryRun: true },
    );
    expect(_getLoggedText()).not.toContain("ava release notes");
  });

  it("names the -alpha tag and retries with --alpha on the alpha line", () => {
    reportReleaseNotesOutcome(
      { kind: "tag-not-found" },
      { plan: ALPHA_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain("Could not find tag v0.15.0-alpha");
    expect(_getLoggedText()).toContain(
      "ava release notes --version 0.15.0 --alpha",
    );
  });

  it("names the -alpha tag when alpha release notes already exist", () => {
    reportReleaseNotesOutcome(
      {
        kind: "already-exists",
        url: "https://github.com/x/y/releases/tag/v0.15.0-alpha",
      },
      { plan: ALPHA_PLAN, dryRun: false },
    );
    expect(_getLoggedText()).toContain(
      "Release notes already exist for v0.15.0-alpha",
    );
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

  it("asks to release 0.15.0-alpha to PRODUCTION on the alpha line", async () => {
    const { git } = _createFakeCommands();

    await confirmReleasePlan(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      originSourceSha: "source-sha",
      originTargetSha: "target-sha",
      assumeYes: false,
    });

    expect(promptToConfirm).toHaveBeenCalledExactlyOnceWith(
      "Release 0.15.0-alpha to PRODUCTION?",
    );
  });

  it("asks to release 0.14.2, without a destination, on the mainline", async () => {
    const { git } = _createFakeCommands();

    await confirmReleasePlan(git, {
      plan: _createPlan(MAINLINE_RELEASE_LINE),
      originSourceSha: "source-sha",
      originTargetSha: "target-sha",
      assumeYes: false,
    });

    expect(promptToConfirm).toHaveBeenCalledExactlyOnceWith("Release 0.14.2?");
  });

  it("warns that pushing alpha deploys production before asking", async () => {
    const { git } = _createFakeCommands();

    await confirmReleasePlan(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      originSourceSha: "source-sha",
      originTargetSha: "target-sha",
      assumeYes: false,
    });

    expect(_getLoggedText()).toContain(ALPHA_RELEASE_LINE.deployWarning);
  });

  it("aborts when the reviewer declines", async () => {
    vi.mocked(promptToConfirm).mockResolvedValue(false);
    const { git } = _createFakeCommands();

    await expect(
      confirmReleasePlan(git, {
        plan: _createPlan(ALPHA_RELEASE_LINE),
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

  it("links the alpha.yaml deploy run and the -alpha tag on the alpha line", () => {
    const { git } = _createFakeCommands({
      remoteUrl: "git@github.com:AvandarLabs/avandar.git",
    });

    printReleaseSummary(git, {
      plan: _createPlan(ALPHA_RELEASE_LINE),
      releaseSha: "release-sha",
    });

    expect(_getLoggedText()).toContain(
      "Deploy run: https://github.com/AvandarLabs/avandar/actions/workflows/alpha.yaml",
    );
    expect(_getLoggedText()).toContain(
      "https://github.com/AvandarLabs/avandar/releases/tag/v0.15.0-alpha",
    );
  });

  it("links the production.yaml deploy run on the mainline", () => {
    const { git } = _createFakeCommands({
      remoteUrl: "git@github.com:AvandarLabs/avandar.git",
    });

    printReleaseSummary(git, {
      plan: _createPlan(MAINLINE_RELEASE_LINE),
      releaseSha: "release-sha",
    });

    expect(_getLoggedText()).toContain(
      "Deploy run: https://github.com/AvandarLabs/avandar/actions/workflows/production.yaml",
    );
  });
});
