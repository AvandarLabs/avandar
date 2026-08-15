import { FileSystemIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/FileSystemIO";
import { RunLocalCommand } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand";
import { createDockerIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createDockerIO";
import type { SupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

function _createGitIO(
  projectRoot: string,
): Pick<SupabaseLocalEnvironmentIO, "readBranch" | "readWorktreePath"> {
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
export function createSupabaseLocalEnvironmentIO(
  projectRoot: string,
): SupabaseLocalEnvironmentIO {
  FileSystemIO.getAbsolutePathFromFilePath(projectRoot);
  return {
    projectRoot,
    ...FileSystemIO.createFileReadIO(projectRoot),
    ...FileSystemIO.createFileWriteIO(),
    ...FileSystemIO.createPathIO(),
    ..._createGitIO(projectRoot),
    ...createDockerIO(projectRoot),
  };
}
