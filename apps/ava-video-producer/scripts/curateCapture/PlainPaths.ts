import { lstat, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { CaptureFileSafety } from "../captureLib/CaptureFileSafety";
import type { Stats } from "node:fs";
/**
 * Gets the `lstat` of a path, or undefined when nothing exists there.
 * Curation uses it to tell an empty output slot from an occupied one.
 */
async function _getOptionalStatFromPath(
  path: string,
): Promise<Stats | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
/**
 * Gets `name` joined onto `root`, guaranteed to be a real file or directory
 * with no symbolic link on the way (created when `shouldCreate`). Curation
 * reads and writes only through paths it returns.
 */
async function _getPlainPathFromRoot({
  root,
  name,
  isDirectory = false,
  shouldCreate = false,
}: Readonly<{
  root: string;
  name: string;
  isDirectory?: boolean;
  shouldCreate?: boolean;
}>): Promise<string> {
  CaptureFileSafety.validateRelativePath({ value: name });
  const parts = name.split("/");
  let currentPath = root;
  // Check each segment in order, so nothing is read through a link.
  for (const [index, part] of parts.entries()) {
    currentPath = join(currentPath, part);
    let stats = await _getOptionalStatFromPath(currentPath);
    if (!stats && shouldCreate) {
      await mkdir(currentPath);
      stats = await lstat(currentPath);
    }
    if (!stats || stats.isSymbolicLink()) {
      throw new Error("Curation paths must exist without symbolic links");
    }
    const needsDirectory = index < parts.length - 1 || isDirectory;
    if (needsDirectory ? !stats.isDirectory() : !stats.isFile()) {
      throw new Error("Curation path has the wrong file type");
    }
  }
  return currentPath;
}
/**
 * Throws unless a path and everything under it are plain files and
 * directories. Curation runs it before replacing an existing output.
 */
async function _inspectExistingTree(path: string): Promise<void> {
  const stats = await lstat(path);
  if (stats.isSymbolicLink()) {
    throw new Error("Existing curated output must not contain symbolic links");
  }
  if (stats.isDirectory()) {
    // Walk one entry at a time, so the first unsafe entry stops curation.
    for (const name of await readdir(path)) {
      CaptureFileSafety.validateRelativePath({ value: name });
      // Stop traversal on the first unsafe entry and keep only one subtree walk
      // active.
      // react-doctor-disable-next-line async-await-in-loop
      await _inspectExistingTree(join(path, name));
    }
  } else if (!stats.isFile()) {
    throw new Error("Existing curated output must contain plain files only");
  }
}

/**
 * Inspects local paths without following symbolic links during capture
 * curation.
 */
export const PlainPaths = {
  /** Gets the `lstat` of a path, or undefined when nothing exists there. */
  getOptionalStatFromPath: _getOptionalStatFromPath,
  /**
   * Gets `name` joined onto `root`, guaranteed to be a real file or directory
   * with no symbolic link on the way (created when `shouldCreate`).
   */
  getPlainPathFromRoot: _getPlainPathFromRoot,
  /**
   * Throws unless a path and everything under it are plain files and
   * directories.
   */
  inspectExistingTree: _inspectExistingTree,
};
