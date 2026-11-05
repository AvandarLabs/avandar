import { RunLocalCommand } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/RunLocalCommand/RunLocalCommand";
import { propEq } from "@avandar/utils";

/** One checkout of the repository and the branch it has checked out. */
export type BranchWorktree = {
  worktreePath: string;
  /** Undefined for a detached HEAD. */
  branch: string | undefined;
};

/** Where a branch's local Supabase configuration lives, if anywhere. */
export type BranchWorktreeLookup =
  | { kind: "found"; worktreePath: string }
  | { kind: "missingBranch" }
  | { kind: "notCheckedOut" };

function _fromPorcelain(porcelain: string): BranchWorktree[] {
  return porcelain
    .split(/\n\s*\n/)
    .map((block) => {
      return RunLocalCommand.getLinesFromOutput(block);
    })
    .filter((lines) => {
      return lines[0]?.startsWith("worktree ") === true;
    })
    .map((lines) => {
      const branchLine = lines.find((line) => {
        return line.startsWith("branch refs/heads/");
      });
      return {
        worktreePath: (lines[0] ?? "").slice("worktree ".length),
        branch: branchLine?.slice("branch refs/heads/".length),
      };
    });
}

function _findWorktreeFromBranch(
  options: Readonly<{
    branch: string;
    localBranches: readonly string[];
    worktrees: readonly BranchWorktree[];
  }>,
): BranchWorktreeLookup {
  const { branch, localBranches, worktrees } = options;
  if (!localBranches.includes(branch)) {
    return { kind: "missingBranch" };
  }
  const worktree = worktrees.find(propEq("branch", branch));
  return worktree === undefined
    ? { kind: "notCheckedOut" }
    : { kind: "found", worktreePath: worktree.worktreePath };
}

/**
 * Maps local Git branches to the worktrees that have them checked out.
 *
 * A branch's local Supabase settings live in its worktree's env files, so
 * `ava supabase start --branch`, `stop --branch`, and `status --branch` use
 * this to find which worktree to act in, and `ava supabase prune` uses it to
 * tell a live branch's Docker project from one whose branch is gone.
 */
export const BranchWorktrees = {
  /** Parses `git worktree list --porcelain`. */
  fromPorcelain: _fromPorcelain,

  /** Finds the worktree a branch is checked out in. */
  findWorktreeFromBranch: _findWorktreeFromBranch,

  /** Lists every local branch name. */
  readLocalBranches: async (projectRoot: string): Promise<string[]> => {
    return RunLocalCommand.getLinesFromOutput(
      await RunLocalCommand.runOrThrow({
        command: "git",
        args: ["for-each-ref", "--format=%(refname:short)", "refs/heads"],
        cwd: projectRoot,
      }),
    );
  },

  /** Lists every worktree of the repository `projectRoot` belongs to. */
  readWorktrees: async (projectRoot: string): Promise<BranchWorktree[]> => {
    return _fromPorcelain(
      await RunLocalCommand.runOrThrow({
        command: "git",
        args: ["worktree", "list", "--porcelain"],
        cwd: projectRoot,
      }),
    );
  },
};
