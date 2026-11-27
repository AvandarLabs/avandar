import fs from "node:fs/promises";
import type { OwnedProjectArtifact } from "./createPrivateVideoProject.types";

/** Returns the current identity, refusing symlinks and absent artifacts. */
async function _readIdentity(
  filename: string,
): Promise<OwnedProjectArtifact | undefined> {
  try {
    const stat = await fs.lstat(filename);
    return stat.isSymbolicLink()
      ? undefined
      : { filename, device: stat.dev, inode: stat.ino };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/** Removes an owned path only while its original identity still matches. */
async function _remove(
  artifact: OwnedProjectArtifact | undefined,
  isDirectory: boolean,
): Promise<void> {
  if (artifact) {
    const identity = await _readIdentity(artifact.filename);
    if (
      identity?.device === artifact.device &&
      identity.inode === artifact.inode
    ) {
      try {
        if (isDirectory) {
          await fs.rmdir(artifact.filename);
        } else {
          await fs.unlink(artifact.filename);
        }
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            ["ENOENT", "ENOTEMPTY", "EEXIST"].includes(String(error.code))
          )
        ) {
          throw error;
        }
      }
    }
  }
}

/** Ownership checks used during private-project failure cleanup. */
export const OwnedProjectArtifacts = {
  /** Returns an artifact identity without following symlinks. */
  readIdentity: _readIdentity,
  /** Removes a matching file or an empty matching directory. */
  remove: _remove,
};
