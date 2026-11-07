import { access } from "node:fs/promises";
import { BranchWorktrees } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseProjectPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseProjectPaths";
import { SupabaseSwitchState } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchState";
import { DockerInventory } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";
import { SupabasePrunePlan } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";
import { prop, promiseFlatMap } from "@avandar/utils";
import type { SupabasePrunePlanResult } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";

async function _readExistingPaths(
  filePaths: readonly string[],
): Promise<string[]> {
  return await promiseFlatMap([...new Set(filePaths)], async (filePath) => {
    return await access(filePath).then(
      () => {
        return [filePath];
      },
      () => {
        return [];
      },
    );
  });
}

async function _read(repoRoot: string): Promise<SupabasePrunePlanResult> {
  const io = createSupabaseLocalEnvironmentIo(repoRoot);
  const [dockerProjects, localBranches, worktrees, configContents] =
    await Promise.all([
      DockerInventory.readProjects(repoRoot),
      BranchWorktrees.readLocalBranches(repoRoot),
      BranchWorktrees.readWorktrees(repoRoot),
      io.readTextFile(
        SupabaseProjectPaths.getConfigPathFromProjectRoot(repoRoot),
      ),
    ]);
  const [existingWorkdirs, worktreeProjectIds] = await Promise.all([
    _readExistingPaths(dockerProjects.flatMap(prop("workdirs"))),
    promiseFlatMap(
      worktrees.map(prop("worktreePath")),
      async (worktreePath) => {
        try {
          const { projectId } = await SupabaseSwitchState.readEffectiveConfig(
            createSupabaseLocalEnvironmentIo(worktreePath),
          );
          return [{ worktreePath, projectId }];
        } catch {
          // A worktree whose directory is gone has no project to protect.
          return [];
        }
      },
    ),
  ]);
  return SupabasePrunePlan.fromDockerProjects({
    dockerProjects,
    existingWorkdirs,
    sharedProjectId:
      SupabaseConfig.makeStateFromContents(configContents).projectId,
    localBranches,
    worktrees,
    worktreeProjectIds,
  });
}

/**
 * Gathers what `SupabasePrunePlan` needs from Docker, Git, and every
 * worktree's Supabase settings, so `SupabasePruneCli` can plan a prune.
 */
export const PrunePlanReader = {
  /** The prune plan for the repository `repoRoot` belongs to. */
  read: _read,
};
