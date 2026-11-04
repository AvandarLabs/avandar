import path from "node:path";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseConfigOverrides } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfigOverrides/SupabaseConfigOverrides";
import { SHARED_STACK_BRANCH } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { promiseMap } from "@avandar/utils";
import type {
  DevelopmentEnvFile,
  SupabaseBackupManifest,
  SupabaseConfigState,
  SupabaseLocalEnvironmentIo,
  SupabaseSwitchKind,
  SupabaseSwitchSummary,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** Everything on disk that decides a worktree's switch state. */
export type SupabaseSwitchSources = {
  branch: string;
  configContents: string;
  manifest: SupabaseBackupManifest | undefined;
  envFiles: DevelopmentEnvFile[];
};

function _getDevelopmentEnvContents(
  envFiles: readonly DevelopmentEnvFile[],
): string {
  return (
    envFiles.find(({ filePath }) => {
      return path.basename(filePath) === ".env.development";
    })?.contents ?? ""
  );
}

function _getSwitchKind(
  options: Readonly<{
    manifest: SupabaseBackupManifest | undefined;
    localProjectId: string;
    remoteProjectId: string | undefined;
  }>,
): SupabaseSwitchKind {
  const { manifest, localProjectId, remoteProjectId } = options;
  if (manifest?.kind === "local") {
    return manifest.temporaryProjectId === localProjectId ? "local" : "shared";
  }
  if (manifest?.kind === "remote") {
    return manifest.remoteProjectId === remoteProjectId ? "remote" : "shared";
  }
  return "shared";
}

function _makeFromSources(
  sources: Readonly<SupabaseSwitchSources>,
): SupabaseSwitchSummary {
  const { branch, manifest } = sources;
  const envContents = _getDevelopmentEnvContents(sources.envFiles);
  const sharedConfig = SupabaseConfig.makeStateFromContents(
    sources.configContents,
  );
  const config = SupabaseConfigOverrides.makeEffectiveState({
    config: sharedConfig,
    envContents,
  });
  const remoteProjectId =
    SupabaseConfigOverrides.getRemoteProjectIdFromEnvContents(envContents);
  const switchKind = _getSwitchKind({
    manifest,
    localProjectId: config.projectId,
    remoteProjectId,
  });
  const isSwitched = switchKind !== "shared";
  return {
    branch,
    switchKind,
    projectId:
      switchKind === "remote" && remoteProjectId !== undefined
        ? remoteProjectId
        : config.projectId,
    sharedProjectId: sharedConfig.projectId,
    remoteApiUrl:
      manifest?.kind === "remote" && isSwitched
        ? manifest.remoteApiUrl
        : undefined,
    hasStrayOverride:
      !isSwitched &&
      (config.projectId !== sharedConfig.projectId ||
        remoteProjectId !== undefined),
    isExpectedForBranch: isSwitched !== (branch === SHARED_STACK_BRANCH),
    config,
  };
}

/** Reads this branch's backup manifest, if a switch left one behind. */
async function _readManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    branch: string;
    worktreePath: string;
  }>,
): Promise<SupabaseBackupManifest | undefined> {
  try {
    return await SupabaseBackupStore.readManifest({
      io: options.io,
      backupDirectory: SupabaseBackupPaths.backupDirectory({
        projectRoot: options.io.projectRoot,
        branch: options.branch,
        worktreePath: options.worktreePath,
      }),
    });
  } catch {
    return undefined;
  }
}

async function _readSources(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<SupabaseSwitchSources> {
  const [branch, worktreePath, configContents, envFilePaths] =
    await Promise.all([
      io.readBranch(),
      io.readWorktreePath(),
      io.readTextFile(path.join(io.projectRoot, "supabase", "config.toml")),
      io.findDevelopmentEnvFiles(),
    ]);
  const [manifest, envFiles] = await Promise.all([
    _readManifest({ io, branch, worktreePath }),
    promiseMap(envFilePaths, async (filePath) => {
      return { filePath, contents: await io.readTextFile(filePath) };
    }),
  ]);
  return { branch, configContents, manifest, envFiles };
}

/**
 * Decides which Supabase a worktree is really on: the shared develop stack,
 * a branch's own local project, or a hosted project.
 *
 * `ava supabase status`, `start`, and `stop` read it to print which database
 * a command is about to touch, and `status` builds its report on top of it.
 */
export const SupabaseSwitchState = {
  /** The switch state the files on disk describe. */
  makeFromSources: _makeFromSources,

  /** Reads the files that decide a worktree's switch state. */
  readSources: _readSources,

  /**
   * The project id and ports the Supabase CLI uses in a worktree: the
   * `.env.development` overrides on top of `config.toml`.
   */
  readEffectiveConfig: async (
    io: Readonly<SupabaseLocalEnvironmentIo>,
  ): Promise<SupabaseConfigState> => {
    const envPath = path.join(io.projectRoot, ".env.development");
    const [configContents, envContents] = await Promise.all([
      io.readTextFile(path.join(io.projectRoot, "supabase", "config.toml")),
      (await io.pathExists(envPath)) ? io.readTextFile(envPath) : "",
    ]);
    return SupabaseConfigOverrides.makeEffectiveState({
      config: SupabaseConfig.makeStateFromContents(configContents),
      envContents,
    });
  },

  /** Reads and decides a worktree's switch state in one step. */
  read: async (
    io: Readonly<SupabaseLocalEnvironmentIo>,
  ): Promise<SupabaseSwitchSummary> => {
    return _makeFromSources(await _readSources(io));
  },
};
