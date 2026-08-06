/**
 * Ensures the browser OPFS root has read-write permission, requesting it when
 * it is not already granted. Resolves silently when OPFS is unavailable, and
 * throws when a required permission request is denied.
 */
export async function ensureOpfsWritePermission(): Promise<void> {
  // If OPFS is not available, nothing to do.
  if (!("storage" in navigator) || !("getDirectory" in navigator.storage)) {
    return;
  }
  const root: FileSystemDirectoryHandle =
    await navigator.storage.getDirectory();
  const status = await root.queryPermission?.({ mode: "readwrite" });
  if (status === "granted") {
    return;
  }
  if (typeof root.requestPermission === "function") {
    const permission = await root.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      throw new Error("OPFS write permission was not granted");
    }
  }
}
