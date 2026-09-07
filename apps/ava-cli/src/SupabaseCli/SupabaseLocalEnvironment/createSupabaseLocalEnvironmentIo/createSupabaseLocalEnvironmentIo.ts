import { createDockerIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createDockerIo";
import { createSeedIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSeedIo";
import { FileSystemIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/FileSystemIo";
import { RunLocalCommand } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/RunLocalCommand/RunLocalCommand";
import type { SupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

function _createGitIo(
  projectRoot: string,
): Pick<SupabaseLocalEnvironmentIo, "readBranch" | "readWorktreePath"> {
  return {
    readBranch: async () => {
      const result = await RunLocalCommand.run({
        command: "git",
        args: ["branch", "--show-current"],
        cwd: projectRoot,
      });
      if (!result.ok) {
        throw new Error(`Cannot read the current Git branch: ${result.stderr}`);
      }
      return result.stdout;
    },
    readWorktreePath: async () => {
      const result = await RunLocalCommand.run({
        command: "git",
        args: ["rev-parse", "--show-toplevel"],
        cwd: projectRoot,
      });
      if (!result.ok) {
        throw new Error(`Cannot read the worktree path: ${result.stderr}`);
      }
      return result.stdout;
    },
  };
}

/** Creates the real local I/O boundary for Supabase switch and restore. */
export function createSupabaseLocalEnvironmentIo(
  projectRoot: string,
): SupabaseLocalEnvironmentIo {
  FileSystemIo.getAbsolutePathFromFilePath(projectRoot);
  return {
    projectRoot,
    ...FileSystemIo.createFileReadIo(projectRoot),
    ...FileSystemIo.createFileWriteIo(),
    ...FileSystemIo.createPathIo(),
    ..._createGitIo(projectRoot),
    ...createDockerIo(projectRoot),
    ...createSeedIo(projectRoot),
  };
}
