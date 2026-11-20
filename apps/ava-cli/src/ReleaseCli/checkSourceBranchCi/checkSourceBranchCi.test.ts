import { checkSourceBranchCi } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { describe, expect, it } from "vitest";
import type {
  CommandResult,
  ReleaseCommands,
} from "@ava-cli/ReleaseCli/createReleaseCommands";

const NOT_CALLED: CommandResult = { ok: false, stdout: "", stderr: "" };

/**
 * A `ReleaseCommands` whose `gh` answers with `runsJson`, recording every
 * `gh` invocation so a test can check which branch and workflow were asked.
 */
function _createFakeGh(runsJson: string): {
  git: ReleaseCommands;
  ghCalls: string[][];
} {
  const ghCalls: string[][] = [];
  const git: ReleaseCommands = {
    repoRoot: "/tmp/fake-repo",
    dryRun: false,
    readGit: () => {
      return undefined;
    },
    tryGit: () => {
      return NOT_CALLED;
    },
    readCommand: (command: string, args: readonly string[]) => {
      ghCalls.push([command, ...args]);
      return { ok: true, stdout: runsJson, stderr: "" };
    },
    mutate: () => {
      return NOT_CALLED;
    },
    mutateQuietly: () => {
      return NOT_CALLED;
    },
  };
  return { git, ghCalls };
}

const PASSED_RUN_JSON = JSON.stringify([
  {
    headSha: "release-sha",
    status: "completed",
    conclusion: "success",
    url: "https://github.com/x/y/actions/runs/1",
  },
]);

describe("checkSourceBranchCi", () => {
  it("asks for alpha-dev.yaml runs on alpha-dev on the alpha line", () => {
    const { git, ghCalls } = _createFakeGh(PASSED_RUN_JSON);

    checkSourceBranchCi(git, {
      commitSha: "release-sha",
      line: ALPHA_RELEASE_LINE,
    });

    expect(ghCalls).toEqual([
      [
        "gh",
        "run",
        "list",
        "--branch",
        "alpha-dev",
        "--workflow",
        "alpha-dev.yaml",
        "--limit",
        "20",
        "--json",
        "headSha,status,conclusion,url",
      ],
    ]);
  });

  it("asks for staging.yaml runs on develop on the mainline", () => {
    const { git, ghCalls } = _createFakeGh(PASSED_RUN_JSON);

    checkSourceBranchCi(git, {
      commitSha: "release-sha",
      line: MAINLINE_RELEASE_LINE,
    });

    expect(ghCalls).toEqual([
      [
        "gh",
        "run",
        "list",
        "--branch",
        "develop",
        "--workflow",
        "staging.yaml",
        "--limit",
        "20",
        "--json",
        "headSha,status,conclusion,url",
      ],
    ]);
  });

  it("passes only when the run for the released commit succeeded", () => {
    const { git } = _createFakeGh(PASSED_RUN_JSON);

    expect(
      checkSourceBranchCi(git, {
        commitSha: "release-sha",
        line: ALPHA_RELEASE_LINE,
      }),
    ).toEqual({ kind: "passed", url: "https://github.com/x/y/actions/runs/1" });
    expect(
      checkSourceBranchCi(git, {
        commitSha: "another-sha",
        line: ALPHA_RELEASE_LINE,
      }),
    ).toEqual({ kind: "missing" });
  });
});
