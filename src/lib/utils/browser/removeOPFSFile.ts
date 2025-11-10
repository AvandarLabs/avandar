import { ensureOPFSWritePermission } from "./ensureOPFSWritePermission";

/**
 * Removes a file from the browser OPFS.
 *
 * The file path does not need to include the `opfs://` prefix.
 */
export async function removeOPFSFile(filePath: string): Promise<void> {
  const fileName = filePath.replace("opfs://", "");
  const root = await navigator.storage.getDirectory();

  // Ensure write permission (some browsers require this explicitly)
  await ensureOPFSWritePermission();

  await root.removeEntry(fileName, { recursive: false });
}
