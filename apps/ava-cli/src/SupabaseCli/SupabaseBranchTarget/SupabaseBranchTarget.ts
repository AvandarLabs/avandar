import { BranchWorktrees } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import type { SupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** The worktree a command acts in, or why it cannot act. */
export type SupabaseBranchTargetResult =
  | { kind: "found"; io: SupabaseLocalEnvironmentIo }
  | { kind: "failed"; message: string; hint: string };

/**
 * Finds the worktree whose Supabase settings a command should use: the
 * current one, or the one that has `branch` checked out.
 *
 * Used by `ava supabase start`, `stop`, and `status`, whose `--branch`
 * option acts on another branch's database without changing directory.
 */
export async function readSupabaseBranchTarget(
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
  switch (lookup.kind) {
    case "found":
      return {
        kind: "found",
        io: createSupabaseLocalEnvironmentIo(lookup.worktreePath),
      };
    case "missingBranch":
      return {
        kind: "failed",
        message: `Branch ${branch} does not exist locally.`,
        hint: "Run `git branch --list` to see the local branches, then retry with one of them.",
      };
    case "notCheckedOut":
      return {
        kind: "failed",
        message: `Branch ${branch} exists, but no worktree has it checked out, so it has no Supabase settings of its own.`,
        hint: "Check the branch out in a worktree first, or drop --branch to use the current one.",
      };
  }
}
