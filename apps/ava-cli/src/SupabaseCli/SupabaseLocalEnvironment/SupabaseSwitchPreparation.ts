import path from "node:path";
import { DevServerPort } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { SupabaseBackupHierarchy } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupHierarchy";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { PROJECT_ID_PATTERN } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { SupabasePorts } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabasePorts/SupabasePorts";
import { promiseMap } from "@avandar/utils";
import type {
  SupabaseConfigState,
  SupabaseLocalEnvironmentIO,
  SwitchPreparation,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type SwitchSource = {
  config: SupabaseConfigState;
  configContents: string;
  configPath: string;
};

async function _readSwitchIdentity(
  io: Readonly<SupabaseLocalEnvironmentIO>,
): Promise<{
  branch: string;
  worktreePath: string;
  backupDirectory: string;
}> {
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

async function _readSwitchSource(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
    worktreePath: string;
  }>,
): Promise<SwitchSource> {
  const { io, temporaryProjectId } = options;
  const configPath = path.join(io.projectRoot, "supabase", "config.toml");
  await _requireSwitchSourceFiles({
    io,
    sourcePaths: [configPath],
    worktreePath: options.worktreePath,
  });
  const configContents = await io.readTextFile(configPath);
  const config = SupabaseConfig.makeStateFromContents(configContents);
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
  return { config, configContents, configPath };
}

function _isAllowedSwitchSource(
  options: Readonly<{ worktreePath: string; sourcePath: string }>,
): boolean {
  const { worktreePath, sourcePath } = options;
  const relativePath = path.relative(worktreePath, sourcePath);
  const fileName = path.basename(sourcePath);
  return (
    relativePath === path.join("supabase", "config.toml") ||
    (path.dirname(relativePath) === "." &&
      (fileName === ".env.development" ||
        fileName.startsWith(".env.development.")))
  );
}

async function _requireSwitchSourceFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
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

async function _selectSwitchPorts(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    source: SwitchSource;
    requestedBasePort?: number;
    occupiedHostPorts: readonly number[];
  }>,
): Promise<{ basePort: number; derivedPorts: Record<string, number> }> {
  const basePort = await SupabasePorts.getAvailableBasePortFromPorts({
    currentApiPort: options.source.config.apiPort,
    currentPorts: options.source.config.ports,
    requestedBasePort: options.requestedBasePort,
    occupiedHostPorts: options.occupiedHostPorts,
    isPortAvailable: options.io.isPortAvailable,
  });
  const derivedPorts = SupabasePorts.makeDerivedPortsFromBasePort({
    currentApiPort: options.source.config.apiPort,
    currentPorts: options.source.config.ports,
    basePort,
  });
  return { basePort, derivedPorts };
}

/** Moves the dev server off the port every other worktree serves on. */
async function _selectDevServerPort(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
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
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
    requestedBasePort?: number;
  }>,
): Promise<SwitchPreparation> {
  const { io, temporaryProjectId, requestedBasePort } = options;
  _requireSafeProjectId(temporaryProjectId);
  const identity = await _readSwitchIdentity(io);
  const [source, occupiedHostPorts, envFiles] = await Promise.all([
    _readSwitchSource({
      io,
      temporaryProjectId,
      worktreePath: identity.worktreePath,
    }),
    io.listPublishedHostPorts(),
    io.findDevelopmentEnvFiles(),
  ]);
  const { basePort, derivedPorts } = await _selectSwitchPorts({
    io,
    source,
    requestedBasePort,
    occupiedHostPorts,
  });
  await _requireSwitchSourceFiles({
    io,
    sourcePaths: envFiles,
    worktreePath: identity.worktreePath,
  });
  const devServerPort = await _selectDevServerPort({
    io,
    envFiles,
    currentApiPort: source.config.apiPort,
    basePort,
    derivedPorts,
    occupiedHostPorts,
  });
  await SupabaseBackupHierarchy.prepareBackupHierarchy({ io, ...identity });
  const manifest = await SupabaseBackupStore.createBackup({
    io,
    ...identity,
    temporaryProjectId,
    basePort,
    derivedPorts,
    sourcePaths: [source.configPath, ...envFiles],
  });
  return {
    backupDirectory: identity.backupDirectory,
    configContents: source.configContents,
    configPath: source.configPath,
    devServerPort,
    envFiles,
    manifest,
  };
}

/** Gathers and validates everything a switch needs before it mutates files. */
export const SupabaseSwitchPreparation = {
  prepareSwitch: _prepareSwitch,
};
