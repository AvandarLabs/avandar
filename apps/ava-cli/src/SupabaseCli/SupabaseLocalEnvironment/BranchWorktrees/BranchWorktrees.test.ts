import { BranchWorktrees } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import { describe, expect, it } from "vitest";

const PORCELAIN = `worktree /src/avandar
HEAD aed53c1a3
branch refs/heads/develop

worktree /src/worktrees/avandar/feat/nux
HEAD 51943826a
branch refs/heads/feat/nux

worktree /src/worktrees/avandar/detached
HEAD 0fbc436e6
detached
`;

const WORKTREES = BranchWorktrees.fromPorcelain(PORCELAIN);

describe("BranchWorktrees.fromPorcelain", () => {
  it("reads each worktree's path and checked-out branch", () => {
    expect(WORKTREES).toEqual([
      { worktreePath: "/src/avandar", branch: "develop" },
      { worktreePath: "/src/worktrees/avandar/feat/nux", branch: "feat/nux" },
      { worktreePath: "/src/worktrees/avandar/detached", branch: undefined },
    ]);
  });
});

describe("BranchWorktrees.findWorktreeFromBranch", () => {
  it("finds the worktree a local branch is checked out in", () => {
    expect(
      BranchWorktrees.findWorktreeFromBranch({
        branch: "feat/nux",
        localBranches: ["develop", "feat/nux"],
        worktrees: WORKTREES,
      }),
    ).toEqual({
      kind: "found",
      worktreePath: "/src/worktrees/avandar/feat/nux",
    });
  });

  it("reports a branch that does not exist locally", () => {
    expect(
      BranchWorktrees.findWorktreeFromBranch({
        branch: "feat/gone",
        localBranches: ["develop", "feat/nux"],
        worktrees: WORKTREES,
      }),
    ).toEqual({ kind: "missingBranch" });
  });

  it("reports a local branch that no worktree has checked out", () => {
    expect(
      BranchWorktrees.findWorktreeFromBranch({
        branch: "feat/parked",
        localBranches: ["develop", "feat/nux", "feat/parked"],
        worktrees: WORKTREES,
      }),
    ).toEqual({ kind: "notCheckedOut" });
  });
});
