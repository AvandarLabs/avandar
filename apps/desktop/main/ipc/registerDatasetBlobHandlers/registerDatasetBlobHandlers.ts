import {
  base64ToUint8,
  uint8ToBase64,
} from "../../../../../packages/shared/utils/src/encoding";
import { DatasetBlobContracts } from "../../../../../shared/platform/ipc/contracts/DatasetBlobContracts";
import type { FileSystemDatasetBlobStore } from "../../services/createFileSystemDatasetBlobStore/createFileSystemDatasetBlobStore";
import type { IpcServer } from "../createIpcServer/createIpcServer";

/**
 * Registers the `datasetBlob.*` IPC handlers (`put`, `get`, `delete`,
 * `exists`, `list`, `stat`) on `server`, bound to the given
 * {@link FileSystemDatasetBlobStore}. The webview's
 * {@link DesktopDatasetBlobStore} adapter calls these via `callIpc`.
 *
 * `put` / `get` move bytes as base64 strings over the wire so the JSON
 * envelope stays compact; the store itself works in `Uint8Array`.
 *
 * @param server - The IPC server from `createIpcServer`.
 * @param store - Filesystem blob store from
 *   `createFileSystemDatasetBlobStore`.
 */
export function registerDatasetBlobHandlers(
  server: IpcServer,
  store: FileSystemDatasetBlobStore,
): void {
  server.handle(DatasetBlobContracts.put, async (req) => {
    const bytes = base64ToUint8(req.bytesBase64);
    await store.put(req.key, bytes);
    return { bytesWritten: bytes.byteLength };
  });

  server.handle(DatasetBlobContracts.get, async (req) => {
    const bytes = await store.getBytes(req.key);
    return { bytesBase64: uint8ToBase64(bytes) };
  });

  server.handle(DatasetBlobContracts.delete, async (req) => {
    await store.delete(req.key);
    return { deleted: true };
  });

  server.handle(DatasetBlobContracts.exists, async (req) => {
    const exists = await store.exists(req.key);
    return { exists };
  });

  server.handle(DatasetBlobContracts.list, async (req) => {
    const keys = await store.list(req.prefix);
    return { keys: [...keys] };
  });

  server.handle(DatasetBlobContracts.stat, async (req) => {
    const stat = await store.stat(req.key);
    return { stat };
  });
}
