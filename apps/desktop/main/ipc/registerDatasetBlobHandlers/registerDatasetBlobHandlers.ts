import { DatasetBlobContracts } from "../../../../../shared/platform/ipc/contracts/DatasetBlobContracts";
import type { FileSystemDatasetBlobStore } from "../../services/createFileSystemDatasetBlobStore/createFileSystemDatasetBlobStore";
import type { IpcServer } from "../createIpcServer/createIpcServer";

/*
 * Bytes cross IPC as base64 strings. JSON serialises a `Uint8Array` to
 * a verbose object form; base64 keeps the envelope compact and avoids
 * the awkward `{ "0": 1, "1": 2, ... }` shape. Soon we may add a
 * chunked / streaming variant for parquet files >50MB.
 */
function _uint8ToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function _base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

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
    const bytes = _base64ToUint8(req.bytesBase64);
    await store.put(req.key, bytes);
    return { bytesWritten: bytes.byteLength };
  });

  server.handle(DatasetBlobContracts.get, async (req) => {
    const bytes = await store.getBytes(req.key);
    return { bytesBase64: _uint8ToBase64(bytes) };
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
