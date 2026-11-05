import path from "node:path";
import { DevServerPort } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { SupabaseBackupHierarchy } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupHierarchy";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import {
  DEVELOPMENT_ENV_FILE,
  PROJECT_ID_PATTERN,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { SupabasePorts } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabasePorts/SupabasePorts";
import { SupabaseProjectPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseProjectPaths";
import { SupabaseSwitchState } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchState";
import { promiseMap } from "@avandar/utils";
import type {
  SupabaseBackupRecord,
  SupabaseConfigState,
  SupabaseLocalEnvironmentIo,
  SupabaseSwitchTarget,
  SwitchPreparation,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** The branch, worktree, and backup directory a switch belongs to. */
type SwitchIdentity = {
  branch: string;
  worktreePath: string;
  backupDirectory: string;
};

/** The validated env files a switch backs up and rewrites. */
type SwitchFiles = {
  identity: SwitchIdentity;
  envFiles: string[];
  /** The env file the Supabase CLI and the app read their connection from. */
  developmentEnvPath: string;
};

async function _readSwitchIdentity(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<SwitchIdentity> {
  const branch = await io.readBranch();
  if (branch === "") {
    throw new Error("Supabase switch requires a named Git branch.");
  }
  const worktreePath = await io.readWorktreePath();
  const backupDirectory = SupabaseBackupPaths.backupDirectory({
    projectRoot: io.projectRoot,
    branch,
    worktreePath,
  });
  return { branch, worktreePath, backupDirectory };
}

/** The project and ports the worktree is on, checked against the new id. */
async function _readSwitchSource(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    temporaryProjectId: string;
  }>,
): Promise<SupabaseConfigState> {
  const { io, temporaryProjectId } = options;
  const config = await SupabaseSwitchState.readEffectiveConfig(io);
  if (temporaryProjectId === config.projectId) {
    throw new Error(
      "The temporary project id must differ from the current id.",
    );
  }
  if (await io.hasSupabaseResources(temporaryProjectId)) {
    throw new Error(
      `Project id ${temporaryProjectId} already belongs to another local Supabase stack.`,
    );
  }
  return config;
}

function _isAllowedSwitchSource(
  options: Readonly<{ worktreePath: string; sourcePath: string }>,
): boolean {
  const { worktreePath, sourcePath } = options;
  const relativePath = path.relative(worktreePath, sourcePath);
  const fileName = path.basename(sourcePath);
  return (
    path.dirname(relativePath) === "." &&
    (fileName === DEVELOPMENT_ENV_FILE ||
      fileName.startsWith(`${DEVELOPMENT_ENV_FILE}.`))
  );
}

async function _requireSwitchSourceFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    sourcePaths: readonly string[];
    worktreePath: string;
  }>,
): Promise<void> {
  const canonicalWorktreePath = await options.io.realPath(options.worktreePath);
  await promiseMap(options.sourcePaths, async (sourcePath) => {
    const isFile =
      (await options.io.pathExists(sourcePath)) &&
      (await options.io.isFile(sourcePath));
    const canonicalSourcePath = isFile
      ? await options.io.realPath(sourcePath)
      : "";
    const expectedSourcePath = path.join(
      canonicalWorktreePath,
      path.relative(options.worktreePath, sourcePath),
    );
    if (
      !_isAllowedSwitchSource({
        worktreePath: options.worktreePath,
        sourcePath,
      }) ||
      !isFile ||
      canonicalSourcePath !== expectedSourcePath
    ) {
      throw new Error(
        "Supabase source must be its deterministic regular file.",
      );
    }
  });
}

/** Reads and checks the env files, failing before anything is written. */
async function _readSwitchFiles(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<SwitchFiles> {
  const identity = await _readSwitchIdentity(io);
  const envFiles = await io.findDevelopmentEnvFiles();
  await _requireSwitchSourceFiles({
    io,
    sourcePaths: envFiles,
    worktreePath: identity.worktreePath,
  });
  const developmentEnvPath =
    SupabaseProjectPaths.getDevelopmentEnvPathFromProjectRoot(io.projectRoot);
  if (!envFiles.includes(developmentEnvPath)) {
    throw new Error(
      `Supabase switch needs a ${DEVELOPMENT_ENV_FILE} in ${io.projectRoot}, because the Supabase CLI and the app read their connection from it. Copy .env.example to ${DEVELOPMENT_ENV_FILE} and retry.`,
    );
  }
  return { identity, envFiles, developmentEnvPath };
}

/** Reserves this branch's backup and copies every env file into it. */
async function _createSwitchBackup<Target extends SupabaseSwitchTarget>(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    files: SwitchFiles;
    target: Target;
  }>,
): Promise<Target & SupabaseBackupRecord> {
  const { io, files, target } = options;
  await SupabaseBackupHierarchy.prepareBackupHierarchy({
    io,
    ...files.identity,
  });
  return await SupabaseBackupStore.createBackup({
    io,
    ...files.identity,
    target,
    sourcePaths: files.envFiles,
  });
}

async function _selectSwitchPorts(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    source: SupabaseConfigState;
    requestedBasePort?: number;
    occupiedHostPorts: readonly number[];
  }>,
): Promise<{ basePort: number; derivedPorts: Record<string, number> }> {
  const basePort = await SupabasePorts.getAvailableBasePortFromPorts({
    currentApiPort: options.source.apiPort,
    currentPorts: options.source.ports,
    requestedBasePort: options.requestedBasePort,
    occupiedHostPorts: options.occupiedHostPorts,
    isPortAvailable: options.io.isPortAvailable,
  });
  const derivedPorts = SupabasePorts.makeDerivedPortsFromBasePort({
    currentApiPort: options.source.apiPort,
    currentPorts: options.source.ports,
    basePort,
  });
  return { basePort, derivedPorts };
}

/** Moves the dev server off the port every other worktree serves on. */
async function _selectDevServerPort(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    envFiles: readonly string[];
    currentApiPort: number;
    basePort: number;
    derivedPorts: Record<string, number>;
    occupiedHostPorts: readonly number[];
  }>,
): Promise<number> {
  const {
    io,
    envFiles,
    currentApiPort,
    basePort,
    derivedPorts,
    occupiedHostPorts,
  } = options;
  const envContentsList = await promiseMap(envFiles, (envFile) => {
    return io.readTextFile(envFile);
  });
  return await DevServerPort.getAvailable({
    currentDevServerPort: DevServerPort.fromEnvFiles(envContentsList),
    portDelta: basePort - currentApiPort,
    reservedPorts: [...Object.values(derivedPorts), ...occupiedHostPorts],
    isPortAvailable: io.isPortAvailable,
  });
}

function _requireSafeProjectId(temporaryProjectId: string): void {
  if (!PROJECT_ID_PATTERN.test(temporaryProjectId)) {
    throw new Error(
      "The temporary project id must start with a lower-case letter or number and use only lower-case letters, numbers, hyphens, and underscores.",
    );
  }
}

async function _prepareSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    temporaryProjectId: string;
    requestedBasePort?: number;
  }>,
): Promise<SwitchPreparation> {
  const { io, temporaryProjectId, requestedBasePort } = options;
  _requireSafeProjectId(temporaryProjectId);
  const files = await _readSwitchFiles(io);
  const [source, occupiedHostPorts] = await Promise.all([
    _readSwitchSource({ io, temporaryProjectId }),
    io.listPublishedHostPorts(),
  ]);
  const { basePort, derivedPorts } = await _selectSwitchPorts({
    io,
    source,
    requestedBasePort,
    occupiedHostPorts,
  });
  const devServerPort = await _selectDevServerPort({
    io,
    envFiles: files.envFiles,
    currentApiPort: source.apiPort,
    basePort,
    derivedPorts,
    occupiedHostPorts,
  });
  return {
    backupDirectory: files.identity.backupDirectory,
    developmentEnvPath: files.developmentEnvPath,
    devServerPort,
    envFiles: files.envFiles,
    manifest: await _createSwitchBackup({
      io,
      files,
      target: {
        kind: "local" as const,
        temporaryProjectId,
        basePort,
        derivedPorts,
      },
    }),
  };
}

/** Gathers and validates everything a switch needs before it mutates files. */
export const SupabaseSwitchPreparation = {
  /** Everything a local switch needs, with its backup already taken. */
  prepareSwitch: _prepareSwitch,

  /**
   * Reads the branch identity and env files any switch works on, refusing a
   * worktree without a `.env.development` or with a retargeted env file.
   */
  readSwitchFiles: _readSwitchFiles,

  /** Reserves the branch's backup and copies every env file into it. */
  createSwitchBackup: _createSwitchBackup,
};
