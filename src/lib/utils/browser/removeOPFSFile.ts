import { wait } from "../misc";

/**
 * Removes a file from the browser OPFS.
 *
 * The file path does not need to include the `opfs://` prefix.
 */
export async function removeOPFSFile(filePath: string): Promise<void> {
  const fileName = filePath.replace("opfs://", "");
  const root: FileSystemDirectoryHandle =
    await navigator.storage.getDirectory();

  // Ensure write permission (some browsers require this explicitly)
  await root.queryPermission();
  if (typeof root.requestPermission === "function") {
    const permission = await root.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      throw new Error(`OPFS write permission was not granted for ${filePath}`);
    }
  }

  // Retry a few times in case a SyncAccessHandle is still closing
  const maxAttempts = 5;
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await root.removeEntry(fileName, { recursive: false });
      return;
    } catch (err) {
      lastErr = err;
      // small backoff to let OPFS handles release
      await wait(100 * (i + 1));
    }
  }
  throw lastErr;
}
