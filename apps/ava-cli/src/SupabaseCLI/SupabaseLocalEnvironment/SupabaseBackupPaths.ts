import type { SupabaseBackupManifest } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

import path from "node:path";

function _getBranchKeyFromBranch(branch: string): string {
  return Buffer.from(branch, "utf8").toString("base64url");
}

function _backupDirectory(
  options: Readonly<{
    projectRoot: string;
    branch: string;
    worktreePath: string;
  }>,
): string {
  const worktreeKey = Buffer.from(options.worktreePath, "utf8").toString(
    "base64url",
  );
  return path.join(
    options.projectRoot,
    ".ava",
    "backups",
    "supabase",
    _getBranchKeyFromBranch(options.branch),
    worktreeKey,
  );
}

function _backupHierarchy(
  options: Readonly<{
    projectRoot: string;
    branch: string;
    worktreePath: string;
  }>,
): string[] {
  const supabaseRoot = path.join(
    options.projectRoot,
    ".ava",
    "backups",
    "supabase",
  );
  const branchDirectory = path.join(
    supabaseRoot,
    _getBranchKeyFromBranch(options.branch),
  );
  return [
    path.join(options.projectRoot, ".ava"),
    path.join(options.projectRoot, ".ava", "backups"),
    supabaseRoot,
    branchDirectory,
    _backupDirectory(options),
  ];
}

function _isPathInside(
  options: Readonly<{ parentPath: string; childPath: string }>,
): boolean {
  const { parentPath, childPath } = options;
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function _hasSafeManifestPaths(
  options: Readonly<{
    manifest: SupabaseBackupManifest;
    backupDirectory: string;
    worktreePath: string;
  }>,
): boolean {
  return options.manifest.files.every(({ sourcePath, backupPath }) => {
    return (
      _isPathInside({
        parentPath: options.worktreePath,
        childPath: sourcePath,
      }) &&
      _isPathInside({
        parentPath: options.backupDirectory,
        childPath: backupPath,
      })
    );
  });
}

function _makeBackupPathFromSourcePath(
  options: Readonly<{
    filesDirectory: string;
    sourcePath: string;
    worktreePath: string;
  }>,
): string {
  const relativePath = path.relative(options.worktreePath, options.sourcePath);
  const fileKey = Buffer.from(relativePath, "utf8").toString("base64url");
  return path.join(options.filesDirectory, fileKey);
}

/** Pure path and key derivation for branch-scoped Supabase backups. */
export const SupabaseBackupPaths = {
  backupDirectory: _backupDirectory,
  backupHierarchy: _backupHierarchy,
  backupPathFromSource: _makeBackupPathFromSourcePath,
  hasSafeManifestPaths: _hasSafeManifestPaths,
  isPathInside: _isPathInside,
};
