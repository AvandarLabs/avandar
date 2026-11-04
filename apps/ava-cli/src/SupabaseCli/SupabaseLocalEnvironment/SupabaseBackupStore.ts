import path from "node:path";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import {
  MANIFEST_FILE,
  SUPABASE_BACKUP_STATES,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { promiseMap } from "@avandar/utils";
import { z } from "zod";
import type {
  SupabaseBackupFile,
  SupabaseBackupManifest,
  SupabaseBackupRecord,
  SupabaseLocalEnvironmentIo,
  SupabaseSwitchTarget,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type CopyFileToBackupOptions = {
  io: SupabaseLocalEnvironmentIo;
  sourcePath: string;
  worktreePath: string;
  filesDirectory: string;
};

type CopyFilesToBackupOptions = {
  io: SupabaseLocalEnvironmentIo;
  sourcePaths: readonly string[];
  worktreePath: string;
  filesDirectory: string;
};

type CreateBackupOptions<Target extends SupabaseSwitchTarget> = {
  io: SupabaseLocalEnvironmentIo;
  branch: string;
  worktreePath: string;
  backupDirectory: string;
  target: Target;
  sourcePaths: readonly string[];
};

const ManifestBaseSchema = z.object({
  branch: z.string(),
  worktreePath: z.string(),
  files: z
    .array(z.object({ sourcePath: z.string(), backupPath: z.string() }))
    .min(1),
  state: z.enum(SUPABASE_BACKUP_STATES),
});

const SupabaseBackupManifestSchema = z.preprocess(
  (value) => {
    // A manifest written before remote switches existed has no `kind`.
    return typeof value === "object" && value !== null && !("kind" in value)
      ? { ...value, kind: "local" }
      : value;
  },
  z.discriminatedUnion("kind", [
    ManifestBaseSchema.extend({
      kind: z.literal("local"),
      temporaryProjectId: z.string(),
      basePort: z.number().int(),
      derivedPorts: z.record(z.string(), z.number().int()),
    }),
    ManifestBaseSchema.extend({
      kind: z.literal("remote"),
      remoteProjectId: z.string(),
      remoteApiUrl: z.string(),
    }),
  ]),
);

async function _writeManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
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
    io: SupabaseLocalEnvironmentIo;
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

async function _createBackup<Target extends SupabaseSwitchTarget>(
  options: Readonly<CreateBackupOptions<Target>>,
): Promise<Target & SupabaseBackupRecord> {
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
    const manifest = {
      ...options.target,
      branch: options.branch,
      worktreePath: options.worktreePath,
      files,
      state: "switching" as const,
    };
    await _writeManifest({ io, backupDirectory, manifest });
    return manifest;
  } catch (error) {
    return await _failBackupCreation({ io, backupDirectory, error });
  }
}

async function _readManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
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
    io: SupabaseLocalEnvironmentIo;
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
  /** The project a manifest's switch moved onto, local or hosted. */
  getProjectIdFromManifest: (
    manifest: Readonly<SupabaseBackupManifest>,
  ): string => {
    return manifest.kind === "local"
      ? manifest.temporaryProjectId
      : manifest.remoteProjectId;
  },

  createBackup: _createBackup,
  readManifest: _readManifest,
  restoreFiles: _restoreFiles,
  writeManifest: _writeManifest,
};
