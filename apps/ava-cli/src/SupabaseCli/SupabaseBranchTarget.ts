import { BranchWorktrees } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { match } from "ts-pattern";
import type { SupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** The worktree a command acts in, or why it cannot act. */
export type SupabaseBranchTargetResult =
  | { kind: "found"; io: SupabaseLocalEnvironmentIo }
  | { kind: "failed"; message: string; hint: string };

async function _read(
  branch: string | undefined,
): Promise<SupabaseBranchTargetResult> {
  const repoRoot = findRepoRoot() ?? process.cwd();
  if (branch === undefined) {
    return { kind: "found", io: createSupabaseLocalEnvironmentIo(repoRoot) };
  }
  const [localBranches, worktrees] = await Promise.all([
    BranchWorktrees.readLocalBranches(repoRoot),
    BranchWorktrees.readWorktrees(repoRoot),
  ]);
  const lookup = BranchWorktrees.findWorktreeFromBranch({
    branch,
    localBranches,
    worktrees,
  });
  return match(lookup)
    .with({ kind: "found" }, ({ worktreePath }) => {
      return {
        kind: "found" as const,
        io: createSupabaseLocalEnvironmentIo(worktreePath),
      };
    })
    .with({ kind: "missingBranch" }, () => {
      return {
        kind: "failed" as const,
        message: `Branch ${branch} does not exist locally.`,
        hint: "Run `git branch --list` to see the local branches, then retry with one of them.",
      };
    })
    .with({ kind: "notCheckedOut" }, () => {
      return {
        kind: "failed" as const,
        message: `Branch ${branch} exists, but no worktree has it checked out, so it has no Supabase settings of its own.`,
        hint: "Check the branch out in a worktree first, or drop --branch to use the current one.",
      };
    })
    .exhaustive();
}

/**
 * Finds the worktree whose Supabase settings a command should use: the
 * current one, or the one that has a given branch checked out.
 *
 * Used by `SupabaseLifecycleCli` and `SupabaseStatusCli`, whose `--branch`
 * option acts on another branch's database without changing directory.
 */
export const SupabaseBranchTarget = {
  /**
   * The current worktree when `branch` is undefined, otherwise the one that
   * has `branch` checked out, or why there is none.
   */
  read: _read,
};
