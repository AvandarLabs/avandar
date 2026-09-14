import path from "node:path";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { makeSet, promiseMap, propPasses } from "@avandar/utils";
import type {
  RestorePaths,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIo,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type CanonicalFilePaths = {
  sourcePath: string;
  backupPath: string;
};

type RetargetedCanonicalSourceOptions = {
  canonicalFiles: readonly CanonicalFilePaths[];
  canonicalWorktreePath: string;
  manifest: SupabaseBackupManifest;
  worktreePath: string;
};

function _sourcePathFromBackupEntryName(
  options: Readonly<{
    backupEntryName: string;
    projectRoot: string;
    worktreePath: string;
  }>,
): string {
  const relativePath = Buffer.from(
    options.backupEntryName,
    "base64url",
  ).toString("utf8");
  const hasCanonicalKey =
    Buffer.from(relativePath, "utf8").toString("base64url") ===
    options.backupEntryName;
  const sourcePath = path.resolve(options.worktreePath, relativePath);
  const fileName = path.basename(sourcePath);
  const isDevelopmentEnv =
    path.dirname(sourcePath) === options.projectRoot &&
    (fileName === ".env.development" ||
      fileName.startsWith(".env.development."));
  const isConfig =
    sourcePath === path.join(options.projectRoot, "supabase", "config.toml");
  if (
    !hasCanonicalKey ||
    !SupabaseBackupPaths.isPathInside({
      parentPath: options.worktreePath,
      childPath: sourcePath,
    }) ||
    (!isConfig && !isDevelopmentEnv)
  ) {
    throw new Error(
      "Supabase backup manifest does not contain the complete deterministic file set.",
    );
  }
  return sourcePath;
}

async function _canonicalSourcePath(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    sourcePath: string;
  }>,
): Promise<string> {
  const { io, sourcePath } = options;
  if (await io.pathExists(sourcePath)) {
    if (!(await io.isFile(sourcePath))) {
      throw new Error(
        "Supabase backup source is not a regular non-symlink file.",
      );
    }
    return await io.realPath(sourcePath);
  }
  const canonicalParentPath = await io.realPath(path.dirname(sourcePath));
  return path.join(canonicalParentPath, path.basename(sourcePath));
}

function _requireUniqueCanonicalPaths(
  files: readonly CanonicalFilePaths[],
): void {
  const sourcePaths = makeSet(files, { key: "sourcePath" });
  const backupPaths = makeSet(files, { key: "backupPath" });
  if (sourcePaths.size !== files.length || backupPaths.size !== files.length) {
    throw new Error("Supabase backup manifest has duplicate canonical paths.");
  }
}

async function _canonicalFilesFromManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    manifest: SupabaseBackupManifest;
  }>,
): Promise<CanonicalFilePaths[]> {
  return await promiseMap(
    options.manifest.files,
    async ({ sourcePath, backupPath }) => {
      return {
        sourcePath: await _canonicalSourcePath({ io: options.io, sourcePath }),
        backupPath: await options.io.realPath(backupPath),
      };
    },
  );
}

function _requireCanonicalRestoreRoots(
  paths: Readonly<{
    worktreePath: string;
    backupDirectory: string;
    filesDirectory: string;
  }>,
): void {
  if (
    !SupabaseBackupPaths.isPathInside({
      parentPath: paths.worktreePath,
      childPath: paths.backupDirectory,
    }) ||
    !SupabaseBackupPaths.isPathInside({
      parentPath: paths.backupDirectory,
      childPath: paths.filesDirectory,
    })
  ) {
    throw new Error(
      "Supabase backup has a canonical backup path outside the backup directory.",
    );
  }
}

function _hasRetargetedCanonicalSource(
  options: Readonly<RetargetedCanonicalSourceOptions>,
): boolean {
  return options.canonicalFiles.some(({ sourcePath }, fileIndex) => {
    const manifestSourcePath = options.manifest.files[fileIndex]!.sourcePath;
    const expectedSourcePath = path.join(
      options.canonicalWorktreePath,
      path.relative(options.worktreePath, manifestSourcePath),
    );
    return sourcePath !== expectedSourcePath;
  });
}

function _requireCanonicalFileContainment(
  options: Readonly<{
    canonicalFiles: readonly CanonicalFilePaths[];
    canonicalFilesDirectory: string;
    canonicalWorktreePath: string;
  }>,
): void {
  if (
    options.canonicalFiles.some(
      propPasses("sourcePath", (sourcePath): sourcePath is string => {
        return !SupabaseBackupPaths.isPathInside({
          parentPath: options.canonicalWorktreePath,
          childPath: sourcePath,
        });
      }),
    )
  ) {
    throw new Error(
      "Supabase backup has a canonical source path outside the worktree.",
    );
  }
  if (
    options.canonicalFiles.some(
      propPasses("backupPath", (backupPath): backupPath is string => {
        return !SupabaseBackupPaths.isPathInside({
          parentPath: options.canonicalFilesDirectory,
          childPath: backupPath,
        });
      }),
    )
  ) {
    throw new Error(
      "Supabase backup has a canonical backup path outside the backup directory.",
    );
  }
}

async function _requireCanonicalManifestPaths(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    manifest: SupabaseBackupManifest;
    paths: RestorePaths;
  }>,
): Promise<void> {
  const [
    canonicalWorktreePath,
    canonicalBackupDirectory,
    canonicalFilesDirectory,
    canonicalFiles,
  ] = await Promise.all([
    options.io.realPath(options.paths.worktreePath),
    options.io.realPath(options.paths.backupDirectory),
    options.io.realPath(options.paths.filesDirectory),
    _canonicalFilesFromManifest({
      io: options.io,
      manifest: options.manifest,
    }),
  ]);
  _requireCanonicalRestoreRoots({
    worktreePath: canonicalWorktreePath,
    backupDirectory: canonicalBackupDirectory,
    filesDirectory: canonicalFilesDirectory,
  });
  _requireUniqueCanonicalPaths(canonicalFiles);
  _requireCanonicalFileContainment({
    canonicalFiles,
    canonicalFilesDirectory,
    canonicalWorktreePath,
  });
  if (
    _hasRetargetedCanonicalSource({
      canonicalFiles,
      canonicalWorktreePath,
      manifest: options.manifest,
      worktreePath: options.paths.worktreePath,
    })
  ) {
    throw new Error(
      "Supabase backup canonical source does not match its destination.",
    );
  }
}

function _requireLexicallySafeManifestPaths(
  options: Readonly<{
    manifest: SupabaseBackupManifest;
    paths: RestorePaths;
  }>,
): void {
  const { manifest, paths } = options;
  if (
    !SupabaseBackupPaths.hasSafeManifestPaths({
      manifest,
      backupDirectory: paths.filesDirectory,
      worktreePath: paths.worktreePath,
    })
  ) {
    throw new Error("Supabase backup manifest contains unsafe file paths.");
  }
}

/** Canonical-path checks that keep a restore inside its own worktree. */
export const SupabaseManifestPathChecks = {
  requireCanonicalManifestPaths: _requireCanonicalManifestPaths,
  requireLexicallySafeManifestPaths: _requireLexicallySafeManifestPaths,
  sourcePathFromBackupEntryName: _sourcePathFromBackupEntryName,
};
