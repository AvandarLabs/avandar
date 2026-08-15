import path from "node:path";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupPaths";
import type { SupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type PrepareBackupHierarchyOptions = {
  io: SupabaseLocalEnvironmentIO;
  branch: string;
  worktreePath: string;
  backupDirectory: string;
};

async function _canonicalWorktreeRoot(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    worktreePath: string;
  }>,
): Promise<string> {
  const { io, worktreePath } = options;
  const canonicalProjectRoot = await io.realPath(io.projectRoot);
  const canonicalWorktreePath = await io.realPath(worktreePath);
  if (canonicalProjectRoot !== canonicalWorktreePath) {
    throw new Error("Supabase backup hierarchy has a non-deterministic root.");
  }
  return canonicalWorktreePath;
}

function _canonicalBackupPath(
  options: Readonly<{
    canonicalRoot: string;
    projectRoot: string;
    directoryPath: string;
  }>,
): string {
  const { canonicalRoot, projectRoot, directoryPath } = options;
  return path.join(canonicalRoot, path.relative(projectRoot, directoryPath));
}

async function _requireBackupDirectory(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    directoryPath: string;
    expectedCanonicalPath: string;
  }>,
): Promise<void> {
  const exists = await options.io.pathExists(options.directoryPath);
  const isDirectory =
    exists && (await options.io.isDirectory(options.directoryPath));
  const canonicalPath =
    isDirectory ? await options.io.realPath(options.directoryPath) : "";
  if (!isDirectory || canonicalPath !== options.expectedCanonicalPath) {
    throw new Error(
      "Supabase backup has an unsafe deterministic backup hierarchy.",
    );
  }
}

async function _reserveValidatedBackupDirectory(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    canonicalRoot: string;
    directoryPath: string;
  }>,
): Promise<boolean> {
  const hasAcquired = await options.io.reserveDirectory(options.directoryPath);
  await _requireBackupDirectory({
    io: options.io,
    directoryPath: options.directoryPath,
    expectedCanonicalPath: _canonicalBackupPath({
      canonicalRoot: options.canonicalRoot,
      projectRoot: options.io.projectRoot,
      directoryPath: options.directoryPath,
    }),
  });
  return hasAcquired;
}

async function _prepareBackupHierarchy(
  options: Readonly<PrepareBackupHierarchyOptions>,
): Promise<void> {
  const canonicalRoot = await _canonicalWorktreeRoot({
    io: options.io,
    worktreePath: options.worktreePath,
  });
  const hierarchy = SupabaseBackupPaths.backupHierarchy({
    projectRoot: options.io.projectRoot,
    branch: options.branch,
    worktreePath: options.worktreePath,
  });
  const parentDirectories = hierarchy.slice(0, -1);
  for (const directoryPath of parentDirectories) {
    await _reserveValidatedBackupDirectory({
      io: options.io,
      canonicalRoot,
      directoryPath,
    });
  }
  const hasAcquiredLeaf = await _reserveValidatedBackupDirectory({
    io: options.io,
    canonicalRoot,
    directoryPath: options.backupDirectory,
  });
  if (!hasAcquiredLeaf) {
    throw new Error(
      `Branch ${options.branch} already has an active Supabase switch. Run ava supabase restore first.`,
    );
  }
}

async function _validateBackupHierarchy(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    branch: string;
    worktreePath: string;
  }>,
): Promise<void> {
  const canonicalRoot = await _canonicalWorktreeRoot({
    io: options.io,
    worktreePath: options.worktreePath,
  });
  const directoryPaths = SupabaseBackupPaths.backupHierarchy({
    projectRoot: options.io.projectRoot,
    branch: options.branch,
    worktreePath: options.worktreePath,
  });
  await Promise.all(
    directoryPaths.map(async (directoryPath) => {
      await _requireBackupDirectory({
        io: options.io,
        directoryPath,
        expectedCanonicalPath: _canonicalBackupPath({
          canonicalRoot,
          projectRoot: options.io.projectRoot,
          directoryPath,
        }),
      });
    }),
  );
}

/** Creates and validates the backup directory tree for one worktree. */
export const SupabaseBackupHierarchy = {
  prepareBackupHierarchy: _prepareBackupHierarchy,
  validateBackupHierarchy: _validateBackupHierarchy,
};
