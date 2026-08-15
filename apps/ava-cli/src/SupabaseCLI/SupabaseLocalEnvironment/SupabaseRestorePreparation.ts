import path from "node:path";
import { SupabaseBackupHierarchy } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupHierarchy";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import {
  MANIFEST_FILE,
  PROJECT_ID_PATTERN,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { SupabaseManifestPathChecks } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseManifestPathChecks";
import { makeMap, makeSet, promiseMap, propEq } from "@avandar/utils";
import type {
  RestorePaths,
  RestorePreparation,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type DeterministicManifestFilesOptions = {
  manifest: SupabaseBackupManifest;
  backupEntryNames: readonly string[];
  filesDirectory: string;
  projectRoot: string;
  worktreePath: string;
};

type ValidateRestoreManifestOptions = {
  io: SupabaseLocalEnvironmentIO;
  manifest: SupabaseBackupManifest;
  branch: string;
  paths: RestorePaths;
};

function _requireRestoreIdentity(
  options: Readonly<{
    manifest: SupabaseBackupManifest;
    branch: string;
    worktreePath: string;
  }>,
): void {
  if (
    options.manifest.branch !== options.branch ||
    options.manifest.worktreePath !== options.worktreePath
  ) {
    throw new Error(
      `Supabase backup belongs to worktree ${options.manifest.worktreePath}, not ${options.worktreePath}.`,
    );
  }
  if (!PROJECT_ID_PATTERN.test(options.manifest.temporaryProjectId)) {
    throw new Error("Supabase backup has an unsafe temporary project id.");
  }
}

function _requireUniqueManifestPaths(
  manifest: Readonly<SupabaseBackupManifest>,
): void {
  const sourcePaths = makeSet(manifest.files, { key: "sourcePath" });
  const backupPaths = makeSet(manifest.files, { key: "backupPath" });
  if (sourcePaths.size !== manifest.files.length) {
    throw new Error("Supabase backup manifest has duplicate source paths.");
  }
  if (backupPaths.size !== manifest.files.length) {
    throw new Error("Supabase backup manifest has duplicate backup paths.");
  }
}

function _requireDeterministicManifestFiles(
  options: Readonly<DeterministicManifestFilesOptions>,
): void {
  const expectedFiles = makeMap(options.backupEntryNames, {
    keyFn: (backupEntryName) => {
      return SupabaseManifestPathChecks.sourcePathFromBackupEntryName({
        backupEntryName,
        projectRoot: options.projectRoot,
        worktreePath: options.worktreePath,
      });
    },
    valueFn: (backupEntryName) => {
      return path.join(options.filesDirectory, backupEntryName);
    },
  });
  const hasExactFiles =
    options.manifest.files.length === expectedFiles.size &&
    options.manifest.files.every(({ sourcePath, backupPath }) => {
      return expectedFiles.get(sourcePath) === backupPath;
    });
  if (!hasExactFiles) {
    throw new Error(
      "Supabase backup manifest does not contain the complete deterministic file set.",
    );
  }
}

async function _requireExistingBackupFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  const existence = await promiseMap(
    options.manifest.files,
    async ({ backupPath }) => {
      const exists = await options.io.pathExists(backupPath);
      const isFile = exists ? await options.io.isFile(backupPath) : false;
      return { backupPath, exists: exists && isFile };
    },
  );
  const missingBackup = existence.find(propEq("exists", false));
  if (missingBackup) {
    throw new Error(`Supabase backup has a missing backup file.`);
  }
}

async function _requireCurrentSourcesInManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  const { io, manifest } = options;
  const manifestSources = makeSet(manifest.files, { key: "sourcePath" });
  const configPath = path.join(io.projectRoot, "supabase", "config.toml");
  if (!manifestSources.has(configPath)) {
    throw new Error(
      "Supabase backup complete deterministic file set must include the config backup.",
    );
  }
  const currentEnvFiles = await io.findDevelopmentEnvFiles();
  if (
    currentEnvFiles.some((sourcePath) => {
      return !manifestSources.has(sourcePath);
    })
  ) {
    throw new Error(
      "Supabase backup complete deterministic file set must include every current development environment.",
    );
  }
}

async function _requireCompleteRestoreFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
    paths: RestorePaths;
  }>,
): Promise<void> {
  _requireUniqueManifestPaths(options.manifest);
  await _requireCurrentSourcesInManifest({
    io: options.io,
    manifest: options.manifest,
  });
  await _requireExistingBackupFiles({
    io: options.io,
    manifest: options.manifest,
  });
  const backupEntryNames = await options.io.readDirectory(
    options.paths.filesDirectory,
  );
  _requireDeterministicManifestFiles({
    manifest: options.manifest,
    backupEntryNames,
    filesDirectory: options.paths.filesDirectory,
    projectRoot: options.io.projectRoot,
    worktreePath: options.paths.worktreePath,
  });
}

async function _validateRestoreManifest(
  options: Readonly<ValidateRestoreManifestOptions>,
): Promise<boolean> {
  _requireRestoreIdentity({
    manifest: options.manifest,
    branch: options.branch,
    worktreePath: options.paths.worktreePath,
  });
  SupabaseManifestPathChecks.requireLexicallySafeManifestPaths({
    manifest: options.manifest,
    paths: options.paths,
  });
  await _requireCompleteRestoreFiles({
    io: options.io,
    manifest: options.manifest,
    paths: options.paths,
  });
  await SupabaseManifestPathChecks.requireCanonicalManifestPaths({
    io: options.io,
    manifest: options.manifest,
    paths: options.paths,
  });
  return await _hasProvenRestoreOwnership({
    io: options.io,
    manifest: options.manifest,
  });
}

async function _hasProvenRestoreOwnership(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<boolean> {
  const { io, manifest } = options;
  const activeProjectId = await (async (): Promise<string | undefined> => {
    try {
      const configPath = path.join(io.projectRoot, "supabase", "config.toml");
      const configContents = await io.readTextFile(configPath);
      return SupabaseConfig.makeStateFromContents(configContents).projectId;
    } catch {
      if (manifest.state === "active") {
        throw new Error("Cannot validate the active Supabase config.");
      }
      return undefined;
    }
  })();
  if (activeProjectId === manifest.temporaryProjectId) {
    return true;
  }
  if (manifest.state === "active") {
    throw new Error(
      "Supabase backup project id does not match the active Supabase config.",
    );
  }
  return false;
}

async function _requireSafeManifestFile(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
  }>,
): Promise<void> {
  const { io, backupDirectory } = options;
  const manifestPath = path.join(backupDirectory, MANIFEST_FILE);
  const exists = await io.pathExists(manifestPath);
  const isFile = exists ? await io.isFile(manifestPath) : false;
  if (!exists || !isFile) {
    throw new Error(`Invalid Supabase backup manifest at ${manifestPath}.`);
  }
  const canonicalBackupDirectory = await io.realPath(backupDirectory);
  const canonicalManifestPath = await io.realPath(manifestPath);
  if (
    !SupabaseBackupPaths.isPathInside({
      parentPath: canonicalBackupDirectory,
      childPath: canonicalManifestPath,
    })
  ) {
    throw new Error(
      "Supabase backup has a canonical manifest path outside the backup directory.",
    );
  }
}

async function _readRestorePreparation(
  io: Readonly<SupabaseLocalEnvironmentIO>,
): Promise<RestorePreparation> {
  const branch = await io.readBranch();
  if (branch === "") {
    throw new Error("Supabase restore requires a named Git branch.");
  }
  const worktreePath = await io.readWorktreePath();
  const backupDirectory = SupabaseBackupPaths.backupDirectory({
    projectRoot: io.projectRoot,
    branch,
    worktreePath,
  });
  if (!(await io.pathExists(backupDirectory))) {
    throw new Error(`Branch ${branch} has no active Supabase switch.`);
  }
  await SupabaseBackupHierarchy.validateBackupHierarchy({
    io,
    branch,
    worktreePath,
  });
  const filesDirectory = path.join(backupDirectory, "files");
  await _requireSafeManifestFile({ io, backupDirectory });
  const manifest = await SupabaseBackupStore.readManifest({
    io,
    backupDirectory,
  });
  const hasProvenOwnership = await _validateRestoreManifest({
    io,
    manifest,
    branch,
    paths: { backupDirectory, filesDirectory, worktreePath },
  });
  return { backupDirectory, hasProvenOwnership, manifest };
}

/** Validates a backup manifest and assembles a restore plan. */
export const SupabaseRestorePreparation = {
  readRestorePreparation: _readRestorePreparation,
};
