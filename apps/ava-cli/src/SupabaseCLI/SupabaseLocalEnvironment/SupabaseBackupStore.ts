import type {
  SupabaseBackupFile,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

import { SupabaseBackupPaths } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupPaths";
import {
  MANIFEST_FILE,
  SUPABASE_BACKUP_STATES,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { promiseMap } from "@avandar/utils";
import path from "node:path";
import { z } from "zod";

type CopyFileToBackupOptions = {
  io: SupabaseLocalEnvironmentIO;
  sourcePath: string;
  worktreePath: string;
  filesDirectory: string;
};

type CopyFilesToBackupOptions = {
  io: SupabaseLocalEnvironmentIO;
  sourcePaths: readonly string[];
  worktreePath: string;
  filesDirectory: string;
};

type CreateBackupOptions = {
  io: SupabaseLocalEnvironmentIO;
  branch: string;
  worktreePath: string;
  backupDirectory: string;
  temporaryProjectId: string;
  basePort: number;
  derivedPorts: Record<string, number>;
  sourcePaths: readonly string[];
};

const SupabaseBackupManifestSchema = z.object({
  branch: z.string(),
  worktreePath: z.string(),
  temporaryProjectId: z.string(),
  basePort: z.number().int(),
  derivedPorts: z.record(z.string(), z.number().int()),
  files: z
    .array(z.object({ sourcePath: z.string(), backupPath: z.string() }))
    .min(1),
  state: z.enum(SUPABASE_BACKUP_STATES),
});

async function _writeManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  const manifestPath = path.join(options.backupDirectory, MANIFEST_FILE);
  await options.io.writeTextFile({
    filePath: manifestPath,
    contents: `${JSON.stringify(options.manifest, null, 2)}\n`,
  });
}

async function _copyFileToBackup(
  options: Readonly<CopyFileToBackupOptions>,
): Promise<SupabaseBackupFile> {
  if (
    !SupabaseBackupPaths.isPathInside({
      parentPath: options.worktreePath,
      childPath: options.sourcePath,
    })
  ) {
    throw new Error(`Cannot back up a file outside ${options.worktreePath}.`);
  }
  const backupPath = SupabaseBackupPaths.backupPathFromSource(options);
  await options.io.copyFile({
    sourcePath: options.sourcePath,
    targetPath: backupPath,
  });
  return { sourcePath: options.sourcePath, backupPath };
}

async function _copyFilesToBackup(
  options: Readonly<CopyFilesToBackupOptions>,
): Promise<SupabaseBackupFile[]> {
  return promiseMap(options.sourcePaths, (sourcePath) => {
    return _copyFileToBackup({ ...options, sourcePath });
  });
}

async function _failBackupCreation(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
    error: unknown;
  }>,
): Promise<never> {
  try {
    await options.io.removePath(options.backupDirectory);
  } catch (cleanupError) {
    throw new AggregateError(
      [options.error, cleanupError],
      `Supabase backup creation failed and partial backup cleanup failed. Backup retained at ${options.backupDirectory}.`,
    );
  }
  throw options.error;
}

async function _createBackup(
  options: Readonly<CreateBackupOptions>,
): Promise<SupabaseBackupManifest> {
  const { io, backupDirectory } = options;
  const filesDirectory = path.join(backupDirectory, "files");
  try {
    await io.makeDirectory(filesDirectory);
    const files = await _copyFilesToBackup({
      io,
      sourcePaths: options.sourcePaths,
      worktreePath: options.worktreePath,
      filesDirectory,
    });
    const manifest: SupabaseBackupManifest = {
      branch: options.branch,
      worktreePath: options.worktreePath,
      temporaryProjectId: options.temporaryProjectId,
      basePort: options.basePort,
      derivedPorts: options.derivedPorts,
      files,
      state: "switching",
    };
    await _writeManifest({ io, backupDirectory, manifest });
    return manifest;
  } catch (error) {
    return await _failBackupCreation({ io, backupDirectory, error });
  }
}

async function _readManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    backupDirectory: string;
  }>,
): Promise<SupabaseBackupManifest> {
  const manifestPath = path.join(options.backupDirectory, MANIFEST_FILE);
  const result = SupabaseBackupManifestSchema.safeParse(
    JSON.parse(await options.io.readTextFile(manifestPath)),
  );
  if (!result.success) {
    throw new Error(`Invalid Supabase backup manifest at ${manifestPath}.`);
  }
  return result.data;
}

async function _restoreFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<void> {
  await promiseMap(
    options.manifest.files,
    async ({ sourcePath, backupPath }) => {
      await options.io.copyFile({
        sourcePath: backupPath,
        targetPath: sourcePath,
      });
    },
  );
}

/** Reads and writes the backup manifest and its copied files. */
export const SupabaseBackupStore = {
  createBackup: _createBackup,
  readManifest: _readManifest,
  restoreFiles: _restoreFiles,
  writeManifest: _writeManifest,
};
