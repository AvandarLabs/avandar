import { removeOPFSFile } from "./removeOPFSFile";

/**
 * Remove all files from the browser OPFS.
 *
 * This function only works in Chrome.
 */
export async function clearOPFS(): Promise<void> {
  const opfsRoot: FileSystemDirectoryHandle =
    await navigator.storage.getDirectory();

  // `.remove()` is not a standard method yet, but if it's available
  // we should use it.
  if ("remove" in opfsRoot && typeof opfsRoot.remove === "function") {
    await opfsRoot.remove({ recursive: true });
    return;
  }

  // Fallback to `.removeEntry()` if `.remove()` is not available.
  for await (const [name, _] of opfsRoot.entries()) {
    await removeOPFSFile(name);
  }
}
